# ktx-l1-rewrite drafts -- batch 2026-05-26

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill. Apply-pass-author
reviews each card, applies clean drafts, hand-edits flagged-drafts after
verifying the surfaced contradiction. Drafts do NOT auto-apply to L1
(`entities.description`); the apply pass is a separate phase.

---
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
Disables map voting on matchless servers. When set to 1, votemap and next_map refuse; break also refuses when called in matchless mode.

Permission:    server config only
Default:       0
Scope:         Active only when k_matchless is 1, excluding Bloodfest. No effect on standard match servers.

Example:
  # server.cfg -- lock map rotation in pickup mode
  k_no_vote_map 1

See also: votemap, next_map, break, k_vp_map, k_matchless (the mode this gate applies to)
```

### Notes

- Gate fires only inside the matchless + non-bloodfest conditional in both DoSelectMap and PlayerBreak.
- next_map is registered CF_MATCHLESS_ONLY -- the command only exists on matchless servers in the first place; this cvar gates it where it exists.
- break is gated only in matchless mode; in standard match mode, break works normally (it's the unready / stop-countdown command, not a map vote).
---

## k_privategame_voteable (KTX cvar, Voting -- Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1089
- **Catalog line**: 17384
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether players can vote to toggle private-game mode. When disabled, any private-game vote attempt is refused. When enabled, logged-in players with at least 2 participants may vote; the server rules-reset routine will also auto-apply k_privategame_default.
>
> 0 = private-game voting disabled.
> 1 = private-game voting enabled.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 4 (cvar that gates a command without toggling it).

`k_privategame_voteable` is read inside the `voteprivate` handler (`private_game_vote()` at `vote.c:1502`) as an explicit early-return gate: when false, the handler prints "Private game not enabled on this server" and returns without toggling any vote state. No `cvar_toggle_msg` or cycle pattern -- purely gating. The secondary consumer (`execute_rules_reset` at `commands.c:4863`) is a downstream consequence of the gate being enabled (rules-reset only auto-restores `k_privategame` when this flag is set), not a separate shape.

### Proposed draft

```
Controls whether the voteprivate command is available on this server, and whether
rules-reset will automatically restore the private-game state to its default.

Effect:
  0 (disabled): voteprivate is refused with "Private game not enabled on this server".
    No vote state is set. Rules-reset does NOT auto-restore k_privategame to
    k_privategame_default even if they differ.
  1 (enabled): voteprivate is active. On rules-reset, if k_privategame differs
    from k_privategame_default, the server automatically toggles k_privategame
    back to k_privategame_default.

Prerequisites: k_privategame_default should be configured to match the server's
  intended post-reset state; without it, rules-reset auto-toggle has no reference
  point.

Permission:    server config only
Default:       0

Example:
  # server.cfg -- allow players to vote for private-game mode
  k_privategame_voteable 1
  k_privategame_default 0   # server is public by default; vote to enable temporarily

See also: voteprivate (gated command), k_vp_privategame (vote-percentage threshold),
  k_privategame_default (auto-applied by rules-reset when this is enabled),
  k_privategame (current private-game state)
```

### Notes

- FLAG: The existing description states "logged-in players with at least 2 participants may vote" as an unconditional prerequisite. Source (`vote.c:1516-1533`) shows both checks are direction-dependent: they apply only when the server is NOT currently in private-game mode and a player is trying to enable it. Voting to DISABLE private game (when it is currently active) bypasses both the login check and the 2-player minimum. Additionally, admins bypass the 2-player minimum in either direction (`vote.c:1524`). The recast omits these prerequisites from the cvar card (they belong on the `voteprivate` command card) and flags the gap for the apply-pass-author to resolve when recasting `voteprivate`.
- `k_privategame_default` is a live registered cvar (`world.c:1088`, comment: "what to set it to when resetting map"). It is a real sibling cvar, not just a runtime concept -- surfaced in See-also as warranted.
- `k_privategame` (current state cvar, `world.c:1087`) is also in See-also as the runtime state this gate indirectly controls.
- See-also is 4 entries (at the cap): voteprivate + k_vp_privategame + k_privategame_default + k_privategame. All four are load-bearing for a server admin configuring private-game mode.

---

## k_timetop (KTX cvar, Voting -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:934 (registration); src/world.c:1554 + 1694-1707 (FixRules ceiling enforcement); src/commands.c:2957, 3003, 3026 (TimeDown / TimeUp / TimeSet clamp sites)
- **Catalog line**: 17415
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Maximum match time limit (in minutes) that players may set via in-game time/timeset votes. Player-requested values are clamped to this ceiling.
>
> Range: 0-600 (server-clamped). Value 0 or below resets to 30 (server default).
>
> Default: 30 (effective when set to 0).
> Set by: server config.

### Shape classification

Shape 3 -- server-config-only cvar read as a ceiling constant by consumer commands.

`k_timetop` has `RegisterCvar("k_timetop")` in `world.c:934` with no paired toggle or cycle command. No `cvar_toggle_msg` site; no gate-read with refusal. The cvar is consumed by `TimeDown()`, `TimeUp()`, and `TimeSet()` in `commands.c` via `bound(0, ..., cvar("k_timetop"))` -- a silent clamp, not a Shape 4 refusal with a message. `FixRules()` additionally enforces the ceiling on the current `timelimit` directly (world.c:1703) and auto-resets `k_timetop` to 30 when it would be 0 or negative (world.c:1696). The handoff note asked to verify Shape 3 vs Shape 4: source confirms Shape 3 (silent clamp, no refusal message citing this cvar).

### Proposed draft

```
Sets the maximum match duration (in minutes) that time-adjustment commands may reach.

Effect:
  The time5, time10, time15, time20, time25, time30, timedown, timeup,
  timedown1, and timeup1 commands all silently clamp their result to this ceiling.
  Attempting to set or step timelimit above k_timetop produces "timelimit still X"
  rather than a refusal message.
  FixRules also enforces this ceiling directly: if the current timelimit exceeds
  k_timetop at rule-fixup time, the server resets timelimit to k_timetop without
  a player-visible message.

Prerequisites: k_timetop is enforced only when deathmatch is active. Hoonymode
  duel, Race, and CA modes bypass the timelimit-reset path in FixRules; the
  ceiling still applies to the time-adjustment commands in those modes.

Permission:    server config only
Default:       30 (effective -- RegisterCvar sets no default; FixRules writes 30
               back whenever the configured value is 0 or below)

Range: 1-600. Values above 600 are clamped to 600 by FixRules. Setting to 0
leaves the effective ceiling at 30 (auto-reset on first rule-fixup).

Example:
  # server.cfg -- cap match time at 20 minutes; players can vote lower but not higher
  k_timetop 20

See also: time5 / time10 / time15 / time20 / time25 / time30 (TimeSet commands
  clamped by this ceiling), timedown / timeup (TimeDown / TimeUp commands
  clamped by this ceiling)
```

### Notes

- FLAG: The existing description says "time/timeset votes" -- there is no `timeset` command in KTX source. The time-adjustment commands are `time5`, `time10`, `time15`, `time20`, `time25`, `time30` (via `TimeSet` handler), `timedown`, `timeup` (5-minute steps via `TimeDown`/`TimeUp`), and `timedown1`, `timeup1` (1-minute steps). All are registered as `CF_PLAYER | CF_SPC_ADMIN` -- any player can invoke them, not just admins. The existing description's "votes" framing is inaccurate (these are player commands, not election-style votes). The recast uses "time-adjustment commands" instead.
- FLAG: The existing description states "Default: 30 (effective when set to 0)". `RegisterCvar("k_timetop")` passes no default argument, so the raw RegisterCvar default is 0. The effective-30 behavior is a runtime side-effect of `FixRules` writing `k_timetop` back to 30 whenever `k_tt <= 0` (`world.c:1696`). The recast surfaces this as "Default: 30 (effective)" with an explicit explanation -- the apply-pass-author should verify this framing matches the oracle's expected Default field format.
- Behavior verified at `commands.c:2957` (TimeDown), `3003` (TimeUp), `3026` (TimeSet): all three use `bound(0, ..., cvar("k_timetop"))`. Silent clamp confirmed; no refusal message referencing `k_timetop` anywhere in source.
- The `FixRules` enforcement at `world.c:1703` (`if ((timelimit > k_tt) ...`) resets `timelimit` to `k_tt` -- this is an additional enforcement path beyond the vote commands. It fires at match-setup/rule-fixup time (not inline with time-adjustment commands). Surfaced in Effect as a distinct bullet.
- Hoonymode duel, Race, and CA bypass the `FixRules` timelimit reset (`world.c:1704`: `if (!isHoonyModeDuel() && !isRACE() && !isCA())`). The ceiling still applies to time-adjustment commands in those modes; only the FixRules enforcement path is bypassed.
- See-also lists the consumer commands by family. Capped at the command family references (two groups: TimeSet family + TimeDown/TimeUp family). Per See-also cap guidance, listing all 9 individual commands by name in See-also would exceed the 4-5 cap; grouping by handler family keeps it scannable. Apply-pass-author may choose to list all individually if the DB's See-also is structured differently.

---

## k_vp_admin (KTX cvar, Voting -- Shape 7a)

- **Status**: drafted
- **Source**: src/world.c:824 (registration); src/vote.c:273 (threshold read)
- **Catalog line**: 17445
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass an admin election (the /elect vote). Values below 51 are treated as 51; maximum is 100. The required vote count is max(2, ceil(percent/100 * eligible players)), so a minimum of 2 votes is always required regardless of player count.
>
> This cvar governs only the /elect admin election path. The /admin command (password / VIP-grant self-promotion) is unrelated.
>
> Range: 51-100 (effective; values below 51 are floored to 51).
>
> Default: not specified (server admin sets this per policy).
> Set by: server config.

### Shape classification

Shape 7a (election threshold cvar). `k_vp_admin` is the percentage threshold read by `get_votes_req(OV_ELECT, ...)` at `vote.c:273` when `get_elect_type() == etAdmin`. The election is time-boxed with `yes`/`no` approval casting -- Shape 7a not 7b. No `cvar_toggle_msg` site, no cycle handler, no command writes it; threshold-cvar-only pattern (the command side is `elect`). Standard `k_vp_*` shape, cleanly matching the Shape 7a threshold cvar template from the catalog.

### Proposed draft

```
Approval threshold for an admin election started by the 'elect' command.

Effect:
  Eligible-player count is determined at tally time (bots excluded).
  Required votes = max(2, ceil(k_vp_admin / 100 * eligible players)).
  Values below 51 are treated as 51; values above 100 are capped at 100.
  Effective range: 51-100.

Prerequisites: k_admins must be enabled and k_allowvoteadmin must be enabled
  (both are gates on the 'elect' command; k_vp_admin has no effect if either gate is off).

Permission:    server config only
Default:       (empty -- defaults to 0, which is treated as 51 at tally time)

Example:
  # server.cfg -- enable admin elections at a 66% threshold
  set k_admins 1
  set k_allowvoteadmin 1
  set k_vp_admin 66

See also: elect (the election command this thresholds), k_allowvoteadmin (gate -- must be enabled for elect to fire), k_admins (gate -- master admin-system toggle), yes (casts approval vote), no (withdraws approval vote)
```

### Notes

- The existing description's v1 shape (Range / Default / Set by block) maps cleanly to v2 Effect + Permission + Default sections. Content is source-accurate; the recast is structural, not factual.
- The Default value clarification: `RegisterCvar("k_vp_admin")` passes no default, so the raw default is `""` (empty string). At tally time `cvar("k_vp_admin")` returns 0.0 for an unset cvar, and `bound(51, 0, 100)` clamps it to 51. The v2 Default line surfaces this as "(empty -- defaults to 0, which is treated as 51 at tally time)" so the operator can choose the most user-readable form for the DB.
- Prerequisites section is included because both `k_admins` and `k_allowvoteadmin` are user-actionable gates that determine whether `k_vp_admin` has any effect. They're not prerequisites on the cvar itself but on the outcome the cvar controls -- surfaced here as context for server admins setting up the election system.
- See-also: 5 entries at the cap. `yes` and `no` are in this batch (cards 34 + 26 respectively); `elect` is card 20; `k_allowvoteadmin` and `k_admins` are prior Server-config batch -- all valid cross-references per operator confirmation.
- No behavioral gaps found in Step 1.5: the single read site at vote.c:273 is the complete behavioral surface. The existing description already captured all consequences (threshold formula, clamping, minimum-2-votes, admin-path-only scope).

---

## k_vp_antilag (KTX cvar, Voting -- Shape 7b)

- **Status**: drafted_with_flag
- **Source**: src/world.c:835 (registration); src/vote.c:321-323 (threshold read); src/vote.c:411-413 (minimum-2 floor); src/vote.c:1373-1411 (vote_check_antilag -- pass effect + admin veto)
- **Catalog line**: 17477
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters (players minus bots) required to pass an antilag vote. On pass, toggles lag compensation off or on server-wide. The antilag vote requires a minimum of 2 approvals regardless of player count. Values below 51 are treated as 51; maximum is 100.
>
> Range: 51-100 (effective; values below 51 floor to 51).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b -- threshold cvar for a continuous toggle vote. `k_vp_antilag` is read by `get_votes_req(OV_ANTILAG, true)` at vote-tally time inside `antilag()`. The vote handler toggles `self->v.antilag`, broadcasts the tally, and checks the threshold continuously (no time-box, no `electguard`, no universal `yes`/`no` involvement). Standard `k_vp_*` cvar side of Shape 7b.

### Proposed draft

```
Percentage of eligible human players (excluding bots) needed to pass an antilag vote.

Effect:
  When the threshold is met (or an admin votes alone), toggles server-wide lag compensation
  off or on -- setting the engine's sv_antilag cvar to 2 (on) or 0 (off).
  An admin voting via the antilag command satisfies the threshold regardless of other votes
  (admin veto path).

  Values below 51 are clamped to 51; maximum is 100.
  A minimum of 2 approvals is always required, regardless of the percentage result.

Permission:    server config only
Default:       0 (effective minimum: 51 -- values at or below 51 behave identically)

Example:
  k_vp_antilag 60   // require 60% approval to toggle antilag

See also: antilag (vote command paired with this threshold), sv_antilag (engine-level state cvar toggled on vote pass -- mvdsv, not KTX L1)
```

### Notes

- FLAG: Existing description states "Default: 51". Source shows `RegisterCvar("k_vp_antilag")` with no explicit default argument -- the stored default is 0 (empty). The effective behavioral minimum is 51 due to `bound(51, percent, 100)` clamping in `get_votes_req()`, but 0 and 51 are not the same stored value. The recast text uses "Default: 0 (effective minimum: 51 -- values at or below 51 behave identically)" to reflect both the stored default and the clamped behavior. Apply-pass-author should verify before committing.
- Admin veto path surfaced from `vote_check_antilag()`: `is_admins_vote(OV_ANTILAG)` fires when an admin is the sole or veto-triggering voter; this path resolves the vote independently of threshold. Not in the existing description; added to Effect.
- sv_antilag is an mvdsv-level cvar (registered in `mvdsv/src/sv_phys.c:53`), not a KTX L1 entity. Cross-linked by name in See-also only, per instructions.
- The toggle writes sv_antilag to 2 (on) or 0 (off) -- not 0/1. The "on" value is 2 (full antilag in mvdsv terminology). Not surfaced in L1 description (implementation detail); operator can observe via `whovote` or checking sv_antilag directly.
- Match-state: the threshold cvar itself can be set at any time. Vote resolution (`vote_check_antilag`) returns early if `match_in_progress` -- the vote only passes pre-match. This constraint lives on the `antilag` command card, not the threshold cvar card.

---

## k_vp_break (KTX cvar, Voting -- Shape 7b)

- **Status**: drafted_with_flag
- **Source**: src/world.c:823 (registration); src/vote.c:244-245 (threshold read); src/vote.c:336-339 (CA voter base); src/vote.c:375-378 (minimum floor); src/match.c:2970-3089 (PlayerBreak handler)
- **Catalog line**: 17507
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a break vote (stopping the current match). Values below 51 are treated as 51; maximum is 100. In Clan Arena, only players in the current series count toward the voter base. Applies only in match mode -- matchless servers use k_vp_map for the equivalent vote instead.
>
> Range: 51 to 100 (effective; values below 51 floor to 51).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b -- vote-threshold cvar for the `break` continuous-toggle vote.

`break` is registered at `commands.c:709` as CF_BOTH (players + spectators); uses `self->v.brk` per-player flag; broadcasts tally via `G_bprint`; calls `vote_check_break()` which checks `get_votes_req(OV_BREAK, true)`; passes threshold to call `EndMatch(0)`. No `electguard`, no timeout, no `yes`/`no` routing. Clean Shape 7b.

### Proposed draft

```
Minimum approval percentage needed to pass a `break` vote that ends an ongoing match.

Effect:
  - The `break` command reads this cvar at tally time: votes cast / eligible players >= k_vp_break / 100. On pass, the match ends immediately.
  - In Clan Arena (mid-match), only players in the current series count as eligible voters; other connected players do not dilute the base.
  - During the pre-match countdown, `/break` stops the countdown directly without a threshold check -- this cvar is not read in that case.
  - In matchless mode, `k_vp_map` governs the equivalent vote (`next_map` / `break` in matchless); this cvar is not read.

Permission:    server config only
Default:       0 (effective 51 -- values below 51 are floored to 51 at tally time; maximum 100).

Example:
  # server.cfg -- require 75% vote to stop a match
  k_vp_break 75

See also: break (vote command this threshold governs), k_vp_map (governs matchless break / next_map votes instead)
```

### Notes

- FLAG: Existing description states "Default: 51". Source shows `RegisterCvar("k_vp_break")` with no explicit default argument -- the stored default is 0 (empty string, evaluates to 0.0). The effective minimum is 51 due to `bound(51, percent, 100)` clamping in `get_votes_req()` at `vote.c:330`. Recast text uses "Default: 0 (effective 51)" per batch discipline established on k_vp_antilag. Apply-pass-author should verify before committing.
- Admin veto path: `is_admins_vote(OV_BREAK)` is NOT called anywhere in vote.c. The admin single-vote shortcut does NOT apply to the break vote (unlike pickup, nospecs, teamoverlay, antilag, etc.). The admin override for break is the separate `forcebreak` command (CF_BOTH_ADMIN, `commands.c:752`). Not surfaced in existing description; not added to cvar card (that's the `break` command card's concern).
- Countdown-stop behavior (match_in_progress == 1): `PlayerBreak` at `match.c:3043-3063` handles the countdown phase as a direct stop (sets `self->ready = 0`, calls `StopTimer(1)` via a `find` for the timer entity) without consulting `k_vp_break`. This is a user-surprise: `/break` does two different things depending on match phase. Added to Effect as a scoping note so the cvar description is accurate about when it is and isn't read.
- Minimum floor: `vt_req = max(1, vt_req)` at `vote.c:377` for the OV_BREAK path. Minimum 1 vote (not 2 like antilag/nospecs). Not surfaced in description; not added -- minimum floor is a `break` command card detail, not a threshold-cvar detail.
- Permission for `break` command: CF_BOTH (players AND spectators). Not relevant to this cvar card.
- See-also is intentionally short (2 entries): the `break` command card is the right place for the full vote-channel behavior including the matchless / countdown nuances. This cvar card scopes to what governs the threshold.
- `next_map` shares the same `PlayerBreak` handler (registered at `commands.c:995` as CF_PLAYER | CF_MATCHLESS_ONLY); in matchless mode `next_map` is the user-facing command that uses the OV_BREAK vote channel with `k_vp_map` as threshold. Not cross-linked here -- that complexity belongs on the `next_map` and `k_vp_map` cards.

---

## k_vp_captain (KTX cvar, Voting -- Shape 7a)

- **Status**: drafted_with_flag
- **Source**: src/world.c:825 (registration); src/vote.c:278 (threshold read)
- **Catalog line**: 17537
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters (players minus bots) required to pass a captain election. Values below 51 are treated as 51; maximum is 100.
>
> Range: 51-100 (effective; values below 51 floor to 51).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7a (election threshold cvar). `k_vp_captain` is the percentage threshold read by `get_votes_req(OV_ELECT, ...)` at `vote.c:278` when `get_elect_type() == etCaptain`. The election is time-boxed (60-second electguard timeout) with `yes`/`no` approval casting -- Shape 7a not 7b. No `cvar_toggle_msg` site, no cycle handler, no command writes it directly; threshold-cvar-only pattern, paired with the `captain` command on the command side. Standard `k_vp_*` shape cleanly matching the Shape 7a threshold cvar template.

No Shape 4 composition: there is no separate enable-gate cvar for captain elections (no `k_allowvotecaptain` equivalent). Mode and player-count gates are enforced inside `VoteCaptain()` directly, not via a standalone gate cvar.

### Proposed draft

```
Approval threshold for a captain election started by the 'captain' command.

Effect:
  Eligible-player count is determined at tally time (bots excluded).
  Required votes = max(2, ceil(k_vp_captain / 100 * eligible players)).
  Values below 51 are treated as 51; values above 100 are capped at 100.
  Effective range: 51-100.
  Election expires after 60 seconds if the threshold is not met.

Permission:    server config only
Default:       (empty -- stored as 0, treated as 51 at tally time)

Example:
  # server.cfg -- require two-thirds approval for captain elections
  set k_vp_captain 66

See also: captain (the election command this thresholds), yes (casts approval vote), no (withdraws approval vote)
```

### Notes

- FLAG: existing description states "Default: 51" -- this is the effective runtime value, not the stored default. `RegisterCvar("k_vp_captain")` passes no explicit default (no `RegisterCvarEx`), so the raw stored value is `""` (empty string). At tally time `cvar("k_vp_captain")` returns 0.0 and `bound(51, 0, 100)` clamps it to 51. The proposed draft corrects this to "(empty -- stored as 0, treated as 51 at tally time)". Systematic pattern across the `k_vp_*` family: only `k_vp_suggestcolor` uses `RegisterCvarEx("k_vp_suggestcolor", "51")` (world.c:827) and therefore has an actual stored default of 51; all others store 0 and clamp at runtime.
- No gate cvars to surface in Prerequisites: unlike `k_vp_admin` (which gates behind `k_admins` + `k_allowvoteadmin`), captain elections have no separate enable cvar. The mode/player-count guards are internal to the `captain` command handler; they are prerequisites on the command, not on this cvar. Omitting Prerequisites section from the cvar card is correct.
- Admin-veto path verified absent: `vote_check_elect()` at `vote.c:651-695` calls `get_votes_req(OV_ELECT, true)` but has no `is_admins_vote(OV_ELECT)` check. The admin single-vote shortcut used by pickup/nospecs/teamoverlay/antilag does NOT apply to captain elections. No surfacing needed on the cvar card (this is about the tally check, not the threshold).
- Minimum-2-votes floor: `vt_req = max(2, vt_req)` at `vote.c:369` applies to all `OV_ELECT` non-latejoin elections. Added to Effect as "Required votes = max(2, ceil(...))" consistent with the k_vp_admin card pattern.
- 60-second timeout: `electguard->s.v.nextthink = g_globalvars.time + 60` at `captain.c:357`. Surfaced in Effect as "Election expires after 60 seconds if the threshold is not met." -- user-actionable behavior distinguishing this from 7b continuous votes.
- See-also is short (3 entries): no gate cvars to cross-link, no state cvar to point at. `captain` is the load-bearing paired command; `yes`/`no` are the approval mechanics.
- Step 1.5 unpacking: the single read site at `vote.c:278` inside `get_votes_req()` is the complete behavioral surface. The existing description already captured the threshold formula and clamping. The timeout (60 s) is new content drawn from `captain.c:357` -- surfaced in Effect. No stickiness/transition-propagation behaviors; election state is cleared by `AbortElect()` / `vote_clear(OV_ELECT)` on timeout or success.

---

## k_vp_coach (KTX cvar, Voting -- Shape 7a)

- **Status**: drafted_with_flag
- **Source**: src/world.c:826
- **Catalog line**: 17567
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum percentage of eligible players required to pass a coach election (a spectator standing for election as team coach).
>
> Range: 51-100 (whole-number percentage; values below 51 behave as 51). Required votes = ceil(percent/100 * player count excluding bots).
>
> Default: 66.
> Set by: server config.

### Shape classification

Shape 7a (election threshold cvar). Pairs with the `coach` starter command (`CF_SPECTATOR`, `commands.c:804`). Universal `yes`/`no` cast approvals; 60-second `electguard` timeout. No separate enable-gate cvar (unlike `k_vp_admin` which has `k_allowvoteadmin`). Mode restriction (team/CTF only) and other guards are internal to the `coach` command handler, not a cvar gate on `k_vp_coach`.

### Proposed draft

```
Approval threshold for a coach election -- the minimum fraction of eligible players that must vote yes for the spectator-candidate to become a coach.

Effect:
  Required votes = max(2, ceil(percent/100 * player count excluding bots)).
  Values below 51 are clamped to 51 at tally time; values above 100 are clamped to 100.
  Election expires after 60 seconds if the threshold is not met.
  At most 2 coaches are active simultaneously; a third election is refused until a slot opens.

Permission:    server config only
Default:       (empty -- stored as 0, clamped to 51 at tally time)

Example:
  # server.cfg -- require two-thirds approval for coach elections
  set k_vp_coach 66

See also: coach (the election command this thresholds), yes (casts approval vote), no (withdraws approval vote), k_vp_captain (sibling threshold cvar, same Shape 7a pattern)
```

### Notes

- FLAG: existing description states "Default: 66" -- this has no source basis. `RegisterCvar("k_vp_coach")` at `world.c:826` passes no explicit default (uses `RegisterCvar`, not `RegisterCvarEx`). The raw stored value is `""` (empty string, reads as 0.0 at runtime). At tally time `bound(51, 0, 100)` clamps to 51. The "66" figure appears to be an assumed server-operator convention, not a registered default. The proposed draft corrects this to "(empty -- stored as 0, clamped to 51 at tally time)" -- consistent with the `k_vp_captain` correction and the systematic `k_vp_*` family pattern (only `k_vp_suggestcolor` has a `RegisterCvarEx` with "51").
- Step 1.5 unpacking: the single read site at `vote.c:283` inside `get_votes_req(OV_ELECT, ...)` is the complete behavioral surface for the cvar. The threshold formula and clamping were already in the existing description. New content surfaced: max-2-coaches hard limit (`coach.c:128`), 60-second timeout (`coach.c:199`: `electguard->s.v.nextthink = g_globalvars.time + 60`), and minimum-2-votes floor (`vote.c:369`, consistent with other OV_ELECT elections).
- Mode and other prerequisites belong on the `coach` command card, not on this cvar card. `VoteCoach()` checks `!isTeam() && !isCTF()` (team/CTF mode required), minimum 3 players, no-pending-election gate, non-empty team name, and no same-team coach already active -- all command-side guards. The cvar card only carries the max-2-coaches limit because it directly bounds when this threshold is consulted at all.
- Re-run behaviors (abort pending election, or demote if already a coach) belong on the `coach` command card only.
- Nospecs-kicks-demoted-coach interaction (`coach.c:79`: `stuffcmd(self, "disconnect\n")` when `_k_nospecs` active and a coach exits) is command-side behavior; omitted from the cvar card.
- See-also has 4 entries: `coach` (load-bearing pair), `yes` / `no` (approval mechanics), `k_vp_captain` (nearest sibling for pattern reference). No gate cvars to cross-link.
- Admin-veto path: `vote_check_elect()` at `vote.c:651-695` has no `is_admins_vote(OV_ELECT)` path. The admin single-vote shortcut (used by pickup/nospecs/teamoverlay/antilag) does not apply to coach elections. No surfacing needed on the cvar card.

## k_vp_coop (KTX cvar, Voting -- Shape 7b)

- **Status**: drafted_with_flag
- **Source**: src/world.c:833
- **Catalog line**: 17597
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum percentage of eligible players required to pass a cooperative-mode vote (switching the server to coop play).
>
> Range: 51-100 (whole-number percentage; values below 51 behave as 51). Required votes = ceil(percent/100 * player count excluding bots).
>
> Default: 66.
> Set by: server config.

### Shape classification

Shape 7b -- continuous toggle vote, threshold cvar side.

`k_vp_coop` is read by `get_votes_req(OV_COOP, true)` in `vote.c:312` as the percentage threshold that `votecoop` must clear. `votecoop` is a continuous-toggle per-player vote (no time-box, no yes/no); re-running withdraws. This is the standard Shape 7b threshold cvar pattern, same as `k_vp_antilag`, `k_vp_nospecs`, `k_vp_teamoverlay`, etc.

### Proposed draft

```
Percentage threshold a 'votecoop' vote must clear to switch the server between coop and deathmatch modes.

Effect:
  When the vote passes (threshold reached or any admin votes yes), the server toggles the current coop
  state (coop ON becomes coop OFF and vice versa), sets deathmatch to the opposite value, and immediately
  reloads the map. If coop is being enabled and a matchless config exists for the current map, that config
  is executed on reload; otherwise the server returns to the "start" map (coop on) or stays on the current
  map (coop off).

  Minimum 1 vote required to pass regardless of player count. Any admin's yes vote passes the vote
  immediately, overriding the threshold.

Range:
  51-100 (whole-number percentage). Values below 51 are treated as 51.
  0 or unset: treated as 51 (clamped at runtime).

Permission:    server config only
Match-state:   pre-match only (voting refused while a deathmatch match is in progress)
Default:       (empty -- runtime effective threshold is 51%)

Example:
  # server.cfg -- require two-thirds of players to pass a coop vote
  k_vp_coop 66

See also: votecoop (the paired continuous-toggle vote command), coop (engine cvar toggled on pass)
```

### Notes

- FLAG: existing description states "Default: 66" -- source is `RegisterCvar("k_vp_coop")` with no second argument (world.c:833), same empty-default pattern as every other `k_vp_*` cvar in this batch. Runtime effective threshold is 51 (the clamp floor), not 66. The "66" in the existing description has no source basis. Apply-pass-author should update the Default line.
- The on-pass effect is a TOGGLE of current coop state, not a forced "enable coop". If coop is already on, a passing vote turns it off. Existing description says "switching the server to coop play" which implies one-directional -- corrected to "toggles the current coop state" in the recast.
- Admin veto: `is_admins_vote(OV_COOP)` at vote.c:1127 -- any admin who has voted YES counts. If `votes > 0`, the vote passes immediately regardless of threshold. Surfaced as a surprise-bearing Effect bullet (not in existing description).
- Match-state refusal: `votecoop()` refuses only when `deathmatch && match_in_progress` (vote.c:1169). If the server is already in coop mode with a match running, `deathmatch` is 0 and the vote is NOT refused. Recast Match-state line says "voting refused while a deathmatch match is in progress" rather than the more ambiguous "pre-match only".
- Minimum vote floor: `vt_req = max(1, vt_req)` at vote.c:397 -- 1 vote minimum (not 2 as for admin elections). Single player can self-pass if they are the only eligible voter.
- The map reload behavior on pass (vote.c:1148-1161) has three branches: matchless cfg → exec cfg + reload; bloodfest → reload to mapname or k_defmap; else → "start" map (coop on) or mapname (coop off). Included at Effect level as "immediately reloads the map" with the config note; detailed branching omitted from L1 (action-level, not implementation-level).
- See-also has 2 entries: `votecoop` (load-bearing pair) and `coop` (the engine cvar directly toggled on pass). `coop` is an mvdsv/engine cvar, not a KTX L1 entity -- cross-link by name is appropriate. No gate cvars to add (coop vote has no Shape 4 enablement gate -- it is always available to non-match deathmatch sessions).

---

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
Percentage of voters required to pass a map-change vote. Used by votemap and -- in matchless mode -- also by next_map and matchless break.

Effect:
  - Values below 51 are clamped to 51; maximum is 100. Default 51 means just
    over half of non-bot players must agree on the same map.
  - When an admin votes for a map, that map wins regardless of total vote count
    -- admin-voted maps have unconditional priority in the map-selection tally.
  - In Race mode (with race-ready players and >10s match time), the required
    vote count equals the number of race-ready players instead of the percentage.
  - On a solo-with-bots server, only 1 vote is needed, so an admin can change
    map alone.

Permission:    server config only
Default:       51 (stored as 0/empty; clamped to 51 at tally time)

Example:
  k_vp_map 60   // 60% of non-bot players must agree on the same map

See also: votemap, next_map, break, cm, k_no_vote_map (disables map voting in matchless), k_vp_break (governs break in standard match mode)
```

### Notes

- Admin priority for map selection is **unconditional**, not tie-breaking. In the vote-tally pass, any admin-voted map wins over a non-admin-voted map regardless of total vote count (the admin-priority check has no equal-vote precondition). Threshold-met test still gates whether the map change actually fires.
- Stored default is 0 (empty string, `RegisterCvar` with no explicit default). The clamp makes the effective floor 51. Description reflects user-facing truth (51) plus the stored-value detail.
- Race-mode formula: when race-ready count > 0 and match time > 10s, requires ALL race-ready players to vote (returns racers_ready directly). Otherwise standard percentage formula.
- Solo-with-bots override: when only 1 human player remains with bots, vt_req = 1 regardless of percentage. Lets admins change map on otherwise-empty servers.
---

## k_vp_nospecs (KTX cvar, Voting -- Shape 7b threshold)

- **Status**: drafted_with_flag
- **Source**: src/world.c:831
- **Catalog line**: 17687
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a no-spectators vote, which toggles whether spectators are allowed on the server.
>
> Range: 51-100 (values below 51 treated as 51).
>
> Default: 51.
> Set by: server config only.

### Shape classification

Shape 7b (threshold cvar for continuous toggle vote).

`k_vp_nospecs` is read by `get_votes_req(OV_NOSPECS, ...)` at vote.c:303-304. The paired vote command `nospecs` (commands.c:1032) toggles `self->v.nospecs` per-player flag, broadcasts running tally via `G_bprint`, checks `get_votes_req(OV_NOSPECS, true)` to determine pass, and on pass calls `vote_check_nospecs()` which flips `_k_nospecs` via `cvar_fset`. No `electguard`, no timeout -- continuous toggle vote. Standard Shape 7b threshold cvar.

### Proposed draft

```
Percentage of eligible voters (players minus bots) required to pass a `nospecs` vote, which toggles whether new spectator connections are accepted and whether existing spectators are kicked.

Effect:
  - Values below 51 are clamped to 51; maximum effective value is 100.
  - When the vote passes (or an admin's single vote decides it): flips the nospecs state. Turning nospecs ON kicks currently connected spectators immediately (VIPs with admin or no-kick rights, and coaches, are exempt) and blocks new spectator connections for the duration. Turning nospecs OFF lifts both restrictions.
  - Direction-sensitive vote minimum: turning nospecs ON requires at least 2 votes; turning it OFF requires only 1. The percentage formula applies after this floor.
  - Nospecs mode auto-clears when all players leave the server pre-match.

Permission:    server config only
Default:       51 (stored as 0/empty; clamped to 51 at tally time).

Example:
  k_vp_nospecs 67   // two-thirds of players must vote to flip nospecs state

See also: nospecs (vote command this threshold governs), _k_nospecs (internal state cvar holding current on/off value)
```

### Notes

- FLAG: Existing description says "Default: 51". `RegisterCvar("k_vp_nospecs")` at world.c:831 stores 0 (no explicit default). The `bound(51, percent, 100)` clamp at vote.c:330 makes the effective floor 51. The user-facing framing is correct (you'd never see behavior at <51%) but the stored value differs. Recast surfaces both via "stored as 0/empty; clamped to 51 at tally time".
- Direction-sensitive vote minimum sourced from vote.c:383-389: `if (fofs == OV_NOSPECS && cvar("_k_nospecs")) vt_req = max(1, vt_req)` (nospecs currently ON, voting to turn OFF) vs `else if (fofs == OV_NOSPECS) vt_req = max(2, vt_req)` (nospecs currently OFF, voting to turn ON). Existing description omits this asymmetry.
- On-pass kick logic at vote.c:972-993: when nospecs turns ON, existing spectators are disconnected via `stuffcmd(spec, "disconnect\n")`. Exemptions: VIPs with `ALLOWED_NOSPECS_VIPS` flags (defined at g_local.h:755 as `VIP_NOTKICKABLE | VIP_ADMIN | VIP_RCON`), real admins (`is_real_adm`), and coaches. Existing spectators who hold any of these roles are not kicked.
- Connection gate at spectate.c:123-135: `nospecs_canconnect()` is called on every new spectator connection attempt. When `_k_nospecs` is active, non-VIP non-coach spectators cannot join. Same exemption set as the kick logic.
- Auto-clear: `FixNoSpecs()` at vote.c:923-931 fires in the game loop and clears `_k_nospecs` if pre-match AND no players remain. Spectators arriving after player count drops to zero find nospecs already cleared.
- Coach demotion edge: coach.c:79-81 disconnects a demoted coach if `_k_nospecs` is active. Losing the coach role causes the nospecs kick to fire retroactively -- not surfaced on the threshold cvar card (belongs on the `nospecs` command card).
- Admin veto path: `is_admins_vote(OV_NOSPECS)` at vote.c:947 -- a single admin vote (when direction-sensitive minimum is 1) can be the deciding vote. Surfaced in Effect as "an admin's single vote decides it" rather than calling it an "admin veto" to avoid confusion with the veto-bypass pattern on other OV_* paths.
- Bidirectional cross-reference: `nospecs` command card in ktx-l1-rewrite-drafts-2026-05-25.md already carries `See also: k_vp_nospecs (vote threshold percentage)`. This card adds the reciprocal `See also: nospecs`.
- `_k_nospecs` is a registered L1 entity (`RegisterCvar("_k_nospecs")` at world.c:785, comment "internal usage, will reject spectators connection") -- the See-also cross-link to it is legitimate. No forward reference to non-existent L3 notes inserted.

---

## k_vp_pickup (KTX cvar, Voting -- Shape 7b)

- **Status**: drafted_with_flag
- **Source**: src/world.c:829
- **Catalog line**: 17717
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a pickup team-shuffle vote.
>
> Range: 51-100 (values below 51 treated as 51).
>
> Default: 51.
> Set by: server config only.

### Shape classification

Shape 7b threshold cvar (continuous toggle vote, no time-box, no yes/no). `k_vp_pickup` is read by `get_votes_req(OV_PICKUP, ...)` in vote.c at tally time. The paired vote command is `pickup` (CF_PLAYER, Shape 7b). Same structural pattern as `k_vp_antilag`, `k_vp_nospecs`, `k_vp_teamoverlay`, and other `k_vp_*` siblings in this batch.

### Proposed draft

```
Minimum share of players required to pass a pickup-game vote.

Effect:
  When the `pickup` vote reaches this threshold, all connected players receive
  a `break` command plus team, color, and skin resets -- clearing current teams
  to create clean pre-pickup conditions.
  An admin casting a pickup vote causes immediate resolution: if threshold is
  already met, the vote passes; if not, the vote is rejected and cleared.

Range: 51-100.  Values below 51 (including the empty default) are treated as 51
at tally time.

Permission:    server config only
Default:       0 (stored empty; effective minimum is 51 -- any value below 51
               is clamped to 51 at tally).

Example:
  k_vp_pickup 67   // two-thirds of players must vote before a pickup game starts

See also: pickup (vote command this threshold governs), k_vp_rpickup (threshold for the random-pickup team-shuffle vote -- a separate mechanism)
```

### Notes

- FLAG: Existing description says "Default: 51". `RegisterCvar("k_vp_pickup")` at world.c:829 stores 0 (no default argument). The `bound(51, percent, 100)` clamp at vote.c:330 makes the effective floor 51. The user-facing framing is correct in spirit but "Default: 51" implies 51 is registered -- the stored default is 0/empty. Recast reflects both: "0 (stored empty; effective minimum is 51)".
- FLAG: Existing description calls this a "team-shuffle vote". The on-pass effect in `vote_check_pickup()` at vote.c:753-759 is NOT a team shuffle -- it stuffs all players with `break\ncolor 0\nteam ""\nskin base\n`, which CLEARS teams and resets player state to prepare for a pickup game. The random team-shuffle is `rpickup`/`k_vp_rpickup`, a separate mechanism. Recast corrects to "clearing current teams to create clean pre-pickup conditions."
- No explicit minimum-vote floor for OV_PICKUP in the `get_votes_req` chain (vote.c:244-430). Unlike OV_RPICKUP (max 3) or OV_ELECT (max 2), OV_PICKUP has no floor arm -- the generic path applies. With small player counts the mathematical minimum may be 1 vote.
- Captain-mode gate: `VotePickup` (commands.c:2546) refuses with "No pickup when captain stuffing" if `k_captains` is active. This gate lives on the `pickup` command card; not surfaced on this threshold cvar card.
- Admin veto mechanism (vote.c:738-746): `is_admins_vote(OV_PICKUP)` counts admins who have voted. When any admin vote is present AND `veto || !get_votes_req(OV_PICKUP, true)` resolves true, the vote is cleared immediately. In practice: an admin casting a `pickup` vote triggers immediate resolution (pass if threshold met; reject otherwise). Surfaced in Effect as immediate-resolution rather than "admin veto" to match the actual code path.
- `k_vp_rpickup` cross-link in See-also is legitimate -- the two cvars govern distinct mechanisms that share the pickup theme but differ in on-pass effect. Cross-link by name only (rpickup command is not in this batch, k_vp_rpickup is card 15).

---

## k_vp_privategame (KTX cvar, Voting -- Shape 7b threshold + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/world.c:837 (registration); src/vote.c:326 (threshold read)
- **Catalog line**: 17747
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum percentage of eligible voters required to pass a private-game vote (toggling forced logins on the server).
>
> Range: 51-100 (clamped; values below 51 treated as 51, above 100 treated as 100).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b threshold cvar + Shape 4 gate composition. `k_vp_privategame` is read by `get_votes_req(OV_PRIVATE, ...)` at vote.c:326 to determine what fraction of players must cast `voteprivate` before the vote passes. The paired vote command (`voteprivate`) is gated by `k_privategame_voteable` (Shape 4): when the gate cvar is 0, casting `voteprivate` is refused entirely and the threshold cvar is irrelevant. Composition: Shape 7b (threshold cvar side of a continuous-toggle vote) + Shape 4 (gated by `k_privategame_voteable`). On-pass effect calls `private_game_toggle()` which flips `k_privategame` between 0 and 1 and sets `sv_login` to enforce login requirements. Vote direction is bidirectional: if private game is currently off, the vote pushes it on; if currently on, the vote pushes it off.

### Proposed draft

```
Percentage of players required to pass a private-game vote -- toggling the server between open (no login required) and login-required mode.

Effect:
  - Threshold is read at tally time via `get_votes_req(OV_PRIVATE)`. Values below 51 are clamped to 51; values above 100 are clamped to 100.
  - A minimum of 2 votes is required regardless of player count or threshold (OV_PRIVATE floor).
  - On pass: flips `k_privategame` between 0 (open) and 1 (private), and sets `sv_login` to enforce login. Login scope (players only vs. all including spectators) is controlled by `k_privategame_allow_specs`.
  - Admin veto: any admin casting a `voteprivate` vote triggers immediate resolution.
  - On map reset: if private-game mode differs from `k_privategame_default`, the server reverts to default.

Prerequisites: `k_privategame_voteable` must be set to 1 -- otherwise `voteprivate` is refused and this threshold has no effect.

Permission:    server config only
Default:       0 (stored empty; effective minimum is 51 -- any value below 51 is clamped to 51 at tally time).

Example:
  k_privategame_voteable 1   // enable voting for private game
  k_vp_privategame 67        // two-thirds of players must vote to switch mode

See also: voteprivate (vote command this threshold governs), k_privategame (state cvar tracking current on/off), k_privategame_voteable (gate -- must be 1 for votes to be allowed)
```

### Notes

- FLAG: Existing description says "Default: 51". `RegisterCvar("k_vp_privategame")` at world.c:837 uses no default argument (stored empty = 0). The `bound(51, percent, 100)` clamp at vote.c:330 makes the effective floor 51 at tally time. The spirit is correct but "Default: 51" implies 51 is the registered value -- it is not. Recast reflects both: "0 (stored empty; effective minimum is 51)".
- "Toggling forced logins" framing in existing description is accurate but incomplete: the on-pass effect (vote.c:1556-1557) also sets `sv_login` (1 or 2 depending on `k_privategame_allow_specs`). The threshold cvar card does not need to enumerate `sv_login` internals -- the Effect refers to `k_privategame_allow_specs` as the scope-controller, which is sufficient at L1.
- Map-reset behavior (commands.c:4863-4866): on reset, if private mode differs from `k_privategame_default` AND `k_privategame_voteable` is set, the server reverts. This is user-surprise-bearing for servers where a vote flipped the mode -- after a map change, the mode silently resets. Surfaced in Effect.
- Admin veto path (vote.c:1467): `is_admins_vote(OV_PRIVATE)` -- any admin vote (even a single admin) triggers the `veto || !get_votes_req(OV_PRIVATE, true)` arm immediately. Consistent with pattern across other OV_* checks.
- Min-vote floor of 2 (vote.c:415-417): OV_PRIVATE has an explicit `vt_req = max(2, vt_req)` arm -- distinct from OV_PICKUP (no floor) and OV_RPICKUP (max 3). Surfaced in Effect.
- `nospecs` (Spectator chat batch, Shape 7b) cross-reference skipped -- no direct relationship.
- `k_teamoverlay` (Server-config batch, Shape 7b state cvar) cross-reference skipped -- no direct relationship.

---

## k_vp_rpickup (KTX cvar, Voting -- Shape 7b threshold)

- **Status**: drafted_with_flag
- **Source**: src/world.c:830
- **Catalog line**: 17777
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum percentage of eligible voters required to pass a random-pickup vote (random team shuffle). Also governs the swapall vote threshold (no separate cvar).
>
> Range: 51-100 (clamped; values below 51 treated as 51, above 100 treated as 100).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b -- continuous toggle vote threshold cvar, shared by two vote commands.

`k_vp_rpickup` is read at vote-tally time by both `OV_RPICKUP` and `OV_SWAPALL` cases in the threshold dispatcher (`vote.c:252-254`). Both vote commands use `self->v.<voteflag>` toggle + `get_votes_req(OV_X, true)` pass-check with no time-box and no universal yes/no -- classic Shape 7b. Multi-consumer threshold is the same structural variant as `k_vp_map` (shared by `cm` + `next_map`); no new shape needed.

### Proposed draft

```
Approval threshold cvar for random-pickup and swap-all votes -- both vote channels share this single cvar (no separate swapall threshold).

Effect:
- Sets the fraction of eligible players required to pass either an `rpickup` vote (random team shuffle) or a `swapall` vote (swap red/blue sides).
- Values below 51 are treated as 51; values above 100 are treated as 100. At least 3 votes are required regardless of percentage or player count.
- An admin casting either vote triggers the effect immediately (admin veto), bypassing the threshold.
- On pass: all players are randomly reassigned to teams (rpickup), or red and blue sides are swapped wholesale (swapall).

Permission:    server config only
Default:       0 (stored empty; effective minimum is 51 -- clamped at tally time)

Example:
  k_vp_rpickup 67   // both rpickup and swapall need two-thirds approval

See also: rpickup (vote command -- random team shuffle), swapall (vote command -- swap red/blue sides)
```

### Notes

- FLAG: Existing description says "Default: 51". `RegisterCvar("k_vp_rpickup")` at `world.c:830` uses no default argument -- stored value is empty = 0 at engine boot. The `bound(51, percent, 100)` clamp at `vote.c:330` makes the effective floor 51 at tally time, but 51 is not the registered default. Recast reflects both: "0 (stored empty; effective minimum is 51)". Same pattern as k_vp_privategame (Card 14).
- Multi-consumer confirmed: `vote.c:252-253` explicitly comments "don't need a dedicated 'swapall' percentage" -- the fallthrough is deliberate and documented in source.
- Min-vote floor of 3: `vote.c:379-381` -- `vt_req = max(3, vt_req)` applies to both OV_RPICKUP and OV_SWAPALL. This is surprise-bearing (larger than the floor for most other vote types: OV_PICKUP has no floor, OV_ELECT has floor 2). Surfaced in Effect.
- Admin veto: `is_admins_vote(OV_RPICKUP)` at `vote.c:792` and `is_admins_vote(OV_SWAPALL)` at `vote.c:1635` -- any admin vote triggers the `veto || !get_votes_req(...)` arm immediately. Consistent with the broader OV_* pattern; surfaced in Effect as it changes the action model for admins.
- `swapall` is CTF-only (`commands.c:6641-6644` `if (!isCTF()) return`). This prerequisite lives on the `swapall` command card, not on the threshold cvar. Not surfaced here.
- `rpickup` requires at least 4 players (`commands.c:5537-5541`). Same -- command-side gate, not threshold-cvar-level.
- `nospecs` (Spectator chat batch, Shape 7b) cross-reference skipped -- no direct relationship.
- `k_teamoverlay` (Server-config batch, Shape 7b state cvar) cross-reference skipped -- no direct relationship.

---

## k_vp_suggestcolor (KTX cvar, Voting -- Shape 7a)

- **Status**: drafted
- **Source**: src/world.c:827
- **Catalog line**: 17807
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a team color-suggestion election. Values below 51 are treated as 51; values above 100 are treated as 100.
>
> Range: 51-100.
>
> Default: 51.
> Set by: server config only.

### Shape classification

Shape 7a (election threshold cvar). `k_vp_suggestcolor` is the percentage threshold read by `get_votes_req(OV_ELECT, ...)` at `vote.c:288` when `get_elect_type() == etSuggestColor`. The election is time-boxed (60-second `electguard` timeout) with universal `yes`/`no` approval casting -- Shape 7a not 7b. No `cvar_toggle_msg` site, no cycle handler, no command writes it directly; standard threshold-cvar-only pattern paired with the `suggestcolor` command. No Shape 4 gate cvar (guards are internal to `SuggestColorVote`).

### Proposed draft

```
Approval threshold for a color-suggestion election -- the minimum fraction of eligible players that must vote yes for the color change to take effect.

Effect:
  Required votes = max(2, ceil(percent/100 * player count excluding bots)).
  Values below 51 are clamped to 51 at tally time; values above 100 are clamped to 100.
  Election expires after 60 seconds if the threshold is not met.

Permission:    server config only
Default:       51

Example:
  # server.cfg -- require two-thirds approval for color-suggestion elections
  set k_vp_suggestcolor 66

See also: suggestcolor (the election command this thresholds), yes (casts approval vote), no (withdraws approval vote), k_vp_captain (sibling threshold cvar, same Shape 7a pattern)
```

### Notes

- Default is genuinely 51: `RegisterCvarEx("k_vp_suggestcolor", "51")` at `world.c:827` stores "51" as the registered default. Unlike sibling `k_vp_*` cvars that use `RegisterCvar` (no default, stored as 0 and clamped to 51 at tally time), this cvar's Default of 51 is accurate as written. No flag needed.
- No gate cvars in Prerequisites: all player-count and session guards (`CountPlayers() < 3`, `get_votes(OV_ELECT)`, `elect_block_till` cooldown) are enforced inside `SuggestColorVote()` at the command handler level, not via a standalone gate cvar. Prerequisites section omitted from the cvar card -- these are command-side gates.
- Admin-veto absent: `vote_check_elect()` at `vote.c:651-695` has no `is_admins_vote(OV_ELECT)` check. The admin-single-vote shortcut used by pickup/nospecs/teamoverlay/antilag does not apply to elections. Not surfaced (absence is not a user-facing behavior).
- Min-vote floor of 2: `vt_req = max(2, vt_req)` at `vote.c:369` applies to all `OV_ELECT` non-latejoin elections including `etSuggestColor`. Surfaced in Effect as "Required votes = max(2, ...)".
- 60-second timeout: `electguard->s.v.nextthink = g_globalvars.time + 60` at `vote.c:1793`. Surfaced in Effect as "Election expires after 60 seconds if the threshold is not met" -- distinguishes Shape 7a from Shape 7b continuous votes.
- Pre-match constraint: `SuggestColorApply()` at `vote.c:697-703` is guarded by `if (!match_in_progress)`. The color change applies only pre-match even if the vote passes. This is a property of the `suggestcolor` command card, not the threshold cvar; not surfaced here.
- `nospecs` (Spectator chat batch, Shape 7b) cross-reference skipped -- no direct relationship.
- `k_teamoverlay` (Server-config batch, Shape 7b state cvar) cross-reference skipped -- no direct relationship.

---

## k_vp_teamoverlay (KTX cvar, Voting -- Shape 7b threshold)

- **Status**: drafted_with_flag
- **Source**: src/world.c:832
- **Catalog line**: 17837
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a team-overlay vote, which toggles team-overlay mode on the server.
>
> Range: 51-100 (values below 51 treated as 51).
>
> Default: 51.
> Set by: server config only.

### Shape classification

Shape 7b threshold cvar -- continuous toggle vote (no time-box, no yes/no).

`k_vp_teamoverlay` is the percentage threshold read by `get_votes_req(OV_TEAMOVERLAY, ...)` at `vote.c:308` to determine how many votes are needed for the `teamoverlay` vote to pass. On pass, `vote_check_teamoverlay()` calls `cvar_fset("k_teamoverlay", !cvar("k_teamoverlay"))` -- flipping the state cvar. Standard Shape 7b threshold cvar pattern; no Shape 4 gate on the paired command (the per-player admin solo-path is admin-veto behavior, not a gate cvar).

### Proposed draft

```
Percentage of eligible players required to pass a teamoverlay vote, which toggles the k_teamoverlay setting on the server.

Effect:
  Threshold is applied as a fraction of active (non-bot) players. Required votes = max(2, ceil(percent / 100 * players)).
  On pass: k_teamoverlay is flipped (0 -> 1 or 1 -> 0). A single admin vote bypasses the threshold and passes the vote immediately.

Range:   51-100. Values below 51 are treated as 51.
Default: 0 (effective minimum 51 -- stored as 0, clamped to 51 at tally time).

Permission:    server config only.
Match-state:   pre-match only (threshold is not checked mid-match; the teamoverlay command only shows current status when a match is in progress).

Example:
  k_vp_teamoverlay 75   // 75% of players must vote before teamoverlay flips

See also: teamoverlay (the vote command this thresholds), k_teamoverlay (the state cvar that flips on pass)
```

### Notes

- FLAG: existing description says "Default: 51" -- source shows `RegisterCvar("k_vp_teamoverlay")` with no explicit default argument (`world.c:832`), which stores the cvar as 0. The value is clamped to 51 only at tally time inside `get_votes_req()`. The stored default is 0, not 51. Proposed draft makes this explicit: "Default: 0 (effective minimum 51 -- stored as 0, clamped to 51 at tally time)". Apply-pass-author should verify this framing matches the pattern used for other `k_vp_*` siblings in this batch before applying.
- Min-vote floor of 2: `vt_req = max(2, vt_req)` at `vote.c:391-393` applies specifically to `OV_TEAMOVERLAY`. On a 2-player server, both players must vote regardless of the percentage threshold. Surfaced in Effect.
- Admin solo-veto: `veto = is_admins_vote(OV_TEAMOVERLAY)` at `vote.c:1050` -- if any admin has cast a teamoverlay vote, the vote passes immediately (admin veto path in `vote_check_teamoverlay()`). User-surprise behavior; surfaced in Effect.
- No fpd bitmask involvement: verified in `teamoverlay()` handler at `vote.c:1073-1108` and `vote_check_teamoverlay()` at `vote.c:1036-1071`. No `iKey(world, "fpd")` or `localcmd("serverinfo fpd ...")` calls. Shape 11b composition note from handoff does NOT apply.
- Cross-batch See-also: `teamoverlay` (this batch, card 30) and `k_teamoverlay` (Server-config batch, `ktx-l1-rewrite-drafts-2026-05-23.md` Shape 7b state cvar) are bidirectional references. Both included in See-also.
- Match-state note: `vote_check_teamoverlay()` at `vote.c:1040` returns early if `match_in_progress || intermission_running || match_over` -- the threshold check (and pass) only fires pre-match. The `teamoverlay` command itself also returns early mid-match (only prints status). Not a prerequisite on this cvar card (it's a command-side behavior) but documented here for the apply-pass-author's context.

---

## antilag (KTX command, Voting -- Shape 7b)

- **Status**: drafted
- **Source**: src/vote.c:1413
- **Catalog line**: 17867
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cast or withdraw your vote to toggle the server's lag-compensation (antilag) mode. When enough players vote, or an admin votes alone, antilag is toggled on or off and the new state is announced. Non-admins cannot start a vote with fewer than 2 players on the server. During a match the command only reports the current antilag state instead of casting a vote.
>
> Set by: player vote command or admin command.

### Shape classification

Shape 7b: continuous toggle vote (no time-box, no yes/no approval). Paired with threshold cvar `k_vp_antilag`. Handler at `vote.c:1413` toggles `self->v.antilag` per-player flag, broadcasts tally via `G_bprint`, checks `get_votes_req(OV_ANTILAG, true)` for pass. On pass, `vote_check_antilag()` sets `sv_antilag` to 2 (on) or 0 (off). No `electguard`, no timeout. Binary on/off state -- no command-per-value fan-out modifier needed.

### Proposed draft

```
Casts (or withdraws) your vote to toggle the server's antilag (lag compensation) mode.

Effect:
  - Toggles your vote for an antilag mode change; re-running the command withdraws your vote.
  - Broadcasts the running vote count to all players.
  - On pass (threshold met, or any admin votes alone): sets sv_antilag to 2 (enabled) or 0 (disabled),
    alternating from the current state. The new state is announced to all players.
  - Mid-match: no vote is cast; the command reports the current antilag state only.

Prerequisites: non-admins require at least 2 players on the server to cast a vote.

Permission:    any player or admin spectator.
Match-state:   vote is cast pre-match only; mid-match invocation reports current state instead.

Example:
  antilag        // casts your vote; server announces the new tally
  antilag        // re-running withdraws your vote

See also: k_vp_antilag (threshold cvar), sv_antilag (mvdsv engine cvar toggled on pass), whovote (shows current antilag voters)
```

### Notes

- All existing description claims verified against source. No contradictions; clean draft.
- Mid-match state-reporter path confirmed: `if (match_in_progress) { G_sprint(self, 2, "Antilag mode %s\n", OnOff(2 == cvar("sv_antilag"))); return; }` at `vote.c:1417-1422`. Vote flag is not toggled.
- 2-player minimum gate: `if (!is_adm(self)) { if (CountPlayers() < 2) { print("You need at least 2 players..."); return; } }` at `vote.c:1425-1433`. Admins bypass entirely. Surfaced as Prerequisites.
- Admin solo-veto: `is_admins_vote(OV_ANTILAG)` at `vote.c:1387`. A single admin vote triggers pass immediately (before threshold). On-pass sets `sv_antilag` via `trap_cvar_set_float("sv_antilag", cvar("sv_antilag") ? 0 : 2)`. Surface in Effect.
- Min-vote floor: `vt_req = max(2, vt_req)` at `vote.c:411-413` for `OV_ANTILAG` -- pass always requires at least 2 votes even if `k_vp_antilag` threshold would allow fewer. This is separate from the 2-player cast gate. Not surfaced in L1 (sub-threshold detail; user-surprise bar not met).
- On-pass value: `sv_antilag = 2` (enabled) not just `1` -- confirmed at `vote.c:1394`. The `OnOff(2 == cvar("sv_antilag"))` check also at `vote.c:1419` confirms 2 is the "on" value.
- `sv_antilag` is an mvdsv engine cvar (not a KTX L1 entity); cross-linked in See-also as a plain name.
- See-also cross-batch: `k_vp_antilag` (this batch, card 5) is the threshold cvar. `whovote` (this batch, card 33) shows antilag voters in its pre-match tally display (confirmed at `commands.c:2196-2209`).
- No Shape 4 gate cvar on antilag vote command; the 2-player check is an inline handler guard, not a `k_*` gating cvar pattern.

---

## cm (KTX command, Voting -- Shape 7b + Shape 4 dual gate)

- **Status**: drafted_with_flag
- **Source**: maps.c:477 (SelectMap handler); maps.c:392 (DoSelectMap logic)
- **Catalog line**: 17894
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts (or changes) a map vote by map-list index. Takes one numeric argument: the position of a map in the server's map list. Broadcasts the suggestion and re-tallies votes; re-voting the same index confirms the existing vote is still good.
>
> Refused if: invoked within 7s of map load (15s in matchless mode), while a match is running outside of a countdown, by non-admin spectators, when map voting is disabled (k_no_vote_map), or when the map is locked (k_lockmap) for non-admins.
>
> Set by: any player or admin spectator.

### Shape classification

Shape 7b (continuous map vote -- no time-box, no yes/no) + Shape 4 dual gate (k_no_vote_map gates in matchless non-bloodfest mode; k_lockmap gates for non-admins in any mode).

`cm` is the index-argument variant of map voting (paired with `next_map` which is the matchless-only vote-to-end-current-map command). Both share the `k_vp_map` threshold and the OV_MAP vote channel. The per-player vote field `self->v.map` holds the chosen map index (non-zero = voted). No cast/withdraw mechanic: re-running with same index confirms; re-running with different index redirects.

### Proposed draft

```
Internal alias-target for casting a map vote by list index. Registered CF_NOALIAS -- direct `/cm` console invocation is blocked. Reachable only as `cmd cm <N>` from a stuffed map-name alias. The server stuffs `alias <mapname> cmd cm <index>` aliases at connect time for clients lacking CF_PARAMS support, so on a legacy client typing `/dm3` expands to `cmd cm 3` under the hood. Modern (CF_PARAMS) clients use the `votemap` route instead, stuffed by the same connect-time mechanism.

Effect:
- Records your vote for the map at position <index> in the server's map list. Broadcasts one of three messages depending on current vote state: "suggests map X" (first voter), "agrees on map X" (others also voting for it), or "would rather play on X" (voting for a map no one else picked yet).
- Re-running with the same index prints "your vote is still good" and does not re-record.
- Re-running with a different index redirects your vote to the new map.
- On threshold: the map with the most votes wins. If an admin voted for a map, that map gets tie-breaking priority over maps with equal non-admin votes.
- In race mode with ready players: only votes from players who are themselves race-ready count toward the tally.

Prerequisites:
- Must wait 7 seconds after map load (15 seconds in matchless mode).
- In matchless (non-bloodfest) mode: k_no_vote_map must not be set; voting is also restricted to the countdown phase (match_in_progress == 2).
- In match mode: may only be cast pre-match; refused while a match is in progress.
- Non-admin spectators: silently refused.
- k_lockmap must not be set for non-admins (broadcasts "MAP IS LOCKED!").

Permission:    any player or admin spectator -- but only reachable as `cmd cm <N>` from a stuffed map-name alias; CF_NOALIAS blocks direct `/cm` console invocation
Match-state:   pre-match (match mode) or matchless countdown phase only; bloodfest mode follows matchless rules without the k_no_vote_map check

Example:
  // a legacy (non-CF_PARAMS) client received `alias dm3 cmd cm 3` at connect
  // via the mapslist_dl mechanism; typing the mapname casts the vote:
  dm3
  // direct `/cm 3` does NOT work -- CF_NOALIAS blocks it.

See also: votemap (user-facing peer; same DoSelectMap, same OV_MAP channel, used by modern CF_PARAMS clients), mapslist_dl (connect-time mechanism that stuffs the per-mapname aliases routing to either cm or votemap), k_vp_map (vote threshold), k_no_vote_map (matchless gate), k_lockmap (map-lock gate)
```

### Notes

- FLAG: Existing description says "when map voting is disabled (k_no_vote_map)" without scoping it to matchless non-bloodfest mode. In standard match-server mode, k_no_vote_map is NOT checked -- the match_in_progress branch at maps.c:419 handles refusal instead. In bloodfest mode (k_matchLess && k_bloodfest), k_no_vote_map is also not checked. The v2 draft scopes this correctly.
- Three broadcast variants confirmed: maps.c:460-470. Existing description says "Broadcasts the suggestion" -- undersells the agree/would-rather-play paths. Surfaced in Effect.
- Admin tie-break confirmed: vote_get_maps() at vote.c:579,588 -- admin-voted map wins ties. Existing description omits this. Surfaced in Effect.
- Race mode vote exclusion confirmed: race_allow_map_vote() at race.c:5637-5648; called from vote_get_maps() at vote.c:554. Non-ready players' votes are filtered out of the tally when racers are ready. Existing description omits this. Surfaced in Effect.
- No cast/withdraw mechanic: unlike most Shape 7b commands, cm has no withdraw path. self->v.map is always set to the new index; the only "same behavior" branch is the confirm-print at maps.c:442-447. The "re-running withdraws" note from Shape 7b catalog does NOT apply to cm.
- CF_BOTH registration means the command dispatcher allows both players and spectators to send it. Non-admin spectator refusal is enforced inside the handler (maps.c:424-427), not at the dispatch level. Effective permission = any player or admin spectator.
- k_lockmap is a Shape 4 gate but is NOT in this batch -- cross-linked by name only.
- No admin solo-veto for OV_MAP (confirmed: vote_get_maps tally path has no is_admins_vote() shortcut for OV_MAP). Admin gets tie-break priority, not instant-pass.
- No minimum vote floor for OV_MAP (unlike antilag which has a max(2, vt_req) guard). Confirmed: vote_check_map() at vote.c:597 uses get_votes_req directly with no floor.
- Bloodfest bypass: when k_matchLess && k_bloodfest, the code falls through to the `else if (match_in_progress)` branch (maps.c:419), so k_no_vote_map is not checked. This is a user-surprise-bearing nuance surfaced in Prerequisites.

---

## elect (KTX command, Voting -- Shape 7a election + Shape 4 x2)

- **Status**: drafted_with_flag
- **Source**: src/admin.c:450 (handler VoteAdmin); src/commands.c:800 (registration)
- **Catalog line**: 17923
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Starts an admin-election vote: all other connected players are prompted to type "yes" to approve, and the requester gains admin rights if enough approve. Running it again while your own election is pending aborts that election instead. Refused if you are already an admin, if another election is already in progress, if admin elections are disabled (k_allowvoteadmin = 0), while a cooldown timer is active, or for a spectator during a live match.
>
> Set by: any player (k_admins and k_allowvoteadmin = 1 required).

### Shape classification

Shape 7a election (admin.c:529-536: sets `self->v.elect = 1` + `self->v.elect_type = etAdmin`, spawns `electguard` with 60-second timeout) + Shape 4 gate on `k_admins` (admin.c:489) + Shape 4 gate on `k_allowvoteadmin` (admin.c:497).

This is the canonical Shape 7a example from the catalog walk -- the shape catalog uses `elect` + `k_vp_admin` as its Shape 7a definition instance. Both Shape 4 gates apply as additional facets per the shapes-are-facets discipline.

### Proposed draft

```
Starts an admin election: all other players are prompted to approve by typing `yes`, and you gain admin rights if enough do.

Effect:
- Broadcasts "X has requested admin rights!" to the server.
- Sends "Type yes in console to approve" to every other player.
- Starts a 60-second countdown; the election aborts automatically on timeout.
- Threshold: at least 2 approvals AND the k_vp_admin percentage of eligible players, whichever is higher.
- Re-running `elect` while your own election is pending aborts it immediately (subsequent-invocation toggle): broadcasts "X aborts election!" and cancels the vote.

Prerequisites:
- `k_admins` must be enabled on this server.
- `k_allowvoteadmin` must be enabled on this server.
- No other election may be in progress (admin, captain, coach, or color elections all block new ones).
- If a previous election ended, timed out, or was aborted, you must wait 30 seconds before starting another.
- If you are mid-way through entering the admin access code, `elect` is refused until you finish.

Permission:    any player; or any spectator pre-match (spectators are silently refused during a live match)
Match-state:   any time (spectator restriction applies only during live matches -- see above)

Example:
  elect               (starts the election; other players see a prompt to type "yes")
  elect               (re-run while election is pending: aborts it)

See also: k_vp_admin (threshold percentage), k_admins (gate, server config batch), k_allowvoteadmin (gate, server config batch), yes (approval command), no (withdrawal command)
```

### Notes

- FLAG: Existing description says "Set by: any player" but the registration flag is `CF_BOTH` (`CF_PLAYER | CF_SPECTATOR` per g_local.h:648-649), meaning both players and spectators can dispatch the command. The spectator-during-live-match block (admin.c:511-514) is a handler-internal guard -- it only fires mid-match. Pre-match, any spectator (including non-admin spectators) can call `elect`. The v2 draft reflects source-truth ("any player; or any spectator pre-match"); the existing "any player" underclaims.
- "You are already an admin" refusal (admin.c:465) is cut per discipline: logically implied (someone running `elect` is trying to become admin; if they're already admin, the user's intent implies they don't meet the self-state check).
- 30-second cooldown duration sourced from vote.c:62 (`p->v.elect_block_till = g_globalvars.time + 30`). The cooldown attaches to the CANDIDATE player (the player with `elect_type != etNone`) when `AbortElect` fires -- set on timeout AND on manual abort. Existing description says "cooldown timer is active" without the duration; surfaced in Prerequisites.
- `k_adminc` conflict sourced from admin.c:458. User can be mid-way through entering the admin code (`/admin <code>`) when they issue `elect`; the refusal message is "Finish entering the code first". This is a surprise-bearing state conflict not in the existing description; surfaced in Prerequisites.
- 60-second timeout sourced from admin.c:536 (`g_globalvars.time + 60`). Not stated in existing description; surfaced in Effect.
- Minimum vote floor: `get_votes_req` at vote.c:369 applies `vt_req = max(2, vt_req)` for OV_ELECT. Combined with the k_vp_admin percentage threshold. Surfaced in Effect as "at least 2 approvals AND the k_vp_admin percentage, whichever is higher."
- "Any other election in progress" gate (admin.c:482) uses `get_votes(OV_ELECT)`, which counts ALL election types (captain, coach, admin, color) -- they all share the same OV_ELECT slot. Existing description says "another election" which is correct phrasing; v2 Prerequisites adds "(admin, captain, coach, or color elections)" to make the scope explicit.
- No admin solo-veto path for OV_ELECT: vote.c:420 exempts OV_ELECT from the bot-floor override. Consistent with no-veto note in k_vp_admin card (this batch).
- See-also is at the 5-item cap. The `k_adminc` conflict doesn't have its own L1 entity -- it's an internal field, not a user-facing command or cvar. No forward reference added.

---

## hook_classic (KTX command, Voting -- Shape 7b + fan-out modifier [CANONICAL CARD])

- **Status**: drafted
- **Source**: src/vote.c:1281 (handler), src/commands.c:919 (registration)
- **Catalog line**: 17950
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to classic. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
>
> Default: n/a (vote command, not a persistent setting).
> Set by: any player via 'hook_classic' (CTF mode, match-gated).

### Shape classification

Shape 7b (continuous toggle vote, no time-box, no yes/no) + command-per-value fan-out modifier. `hook_classic` is the canonical card for the 4-sibling hook-style vote family (`hook_smooth`, `hook_fast`, `hook_classic`, `hook_crhook`). Each sibling casts an independent per-player vote for a specific value (1-4) of `k_ctf_hookstyle`; whichever channel reaches threshold first wins.

Shape 1c (mode-precondition: CTF required) also applies -- the handler enforces `isCTF()` before accepting the vote.

### Proposed draft

```
Casts (or withdraws) your vote to switch the grappling-hook style to classic.
Canonical card for the hook-style vote family (four independent vote channels).

Effect:
  Toggles your personal vote for the classic hook style (k_ctf_hookstyle = 3).
  Broadcasts the running vote tally and how many more votes are needed.
  Re-running the command withdraws your vote.
  When the threshold is met -- or any admin issues the same vote (admin veto) --
    the server sets k_ctf_hookstyle to 3 and announces "hook style set to classic
    by majority vote / admin veto". All votes on this channel are then cleared.

  Four independent hook-style vote channels (any may be active simultaneously;
  whichever reaches threshold first applies):
    hook_smooth   votes for smooth hook   (k_ctf_hookstyle = 1)
    hook_fast     votes for fast hook     (k_ctf_hookstyle = 2)
    hook_classic  votes for classic hook  (k_ctf_hookstyle = 3)  <-- this command
    hook_crhook   votes for crhook        (k_ctf_hookstyle = 4)

  Threshold for hook_smooth / hook_fast / hook_classic: k_vp_hookstyle percent
    of active players (minimum 1 vote; values below 51% are treated as 51%).
  Threshold for hook_crhook: always 51% hardcoded (k_vp_hookstyle does not apply
    to hook_crhook -- that channel is not in the threshold cvar's switch case).

Prerequisites:
  CTF mode must be active ("hook style can only be set in CTF mode").
  No match in progress ("hook style can not be changed while match is in progress").

Permission:    any player
Match-state:   pre-match only (refused during a live match)

Example:
  hook_classic          (casts your vote; server broadcasts the tally)
  hook_classic          (re-run: withdraws your vote)

  (Optional) An admin can force the style immediately by casting a lone vote --
    the server treats any admin vote as a veto and applies it without waiting for
    the full threshold.

See also: k_vp_hookstyle (threshold percentage for smooth/fast/classic channels), k_ctf_hookstyle (state cvar set on pass), hook_smooth (sibling fan-out vote, value 1), hook_fast (sibling fan-out vote, value 2), hook_crhook (sibling fan-out vote, value 4 -- not gated by k_vp_hookstyle)
```

### Notes

- CANONICAL CARD: this card carries the full description for the hook-style vote family. `hook_smooth`, `hook_fast`, and `hook_crhook` are short reference cards that point here.
- OV_HOOKCRHOOK absence from get_votes_req() switch confirmed at vote.c:315-319: the switch covers OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC with `percent = cvar("k_vp_hookstyle")`; OV_HOOKCRHOOK has no case, so it falls through to the `percent = 51` default and no per-OV floor entry. This asymmetry is load-bearing and surfaced explicitly in Effect.
- Admin veto path: `is_admins_vote(OV_HOOKCLASSIC)` at vote.c:1314 returns the count of admins who have cast this vote; if non-zero, the pass fires immediately. Same pattern applies to all 4 hook channels (OV_HOOKSMOOTH/FAST/CLASSIC/HOOKCRHOOK each has its own `is_admins_vote()` call). The "admin casts lone vote = instant pass" framing is source-accurate.
- Min-vote floor: vote.c:399-409 sets `vt_req = max(1, vt_req)` for OV_HOOKSMOOTH, OV_HOOKFAST, and OV_HOOKCLASSIC individually. OV_HOOKCRHOOK has no entry in this block -- consistent with the switch omission.
- CF_PLAYER | CF_MATCHLESS at commands.c:919. CF_MATCHLESS means the command is valid in matchless-mode servers. The handler's `match_in_progress` guard is the actual match-state enforcement; CF_MATCHLESS just ensures the command is accessible in matchless-mode configs.
- k_ctf_hookstyle is in a different category from this batch (not Voting). Cross-referenced by name per no-forward-references rule (no link to a non-existent card is inserted; the cvar name itself is the link anchor).
- See-also at exactly 5 items. All load-bearing: threshold cvar, state cvar, and the 3 sibling commands. hook_smooth and hook_fast are reference cards pointing back here; hook_crhook gets its own note about the k_vp_hookstyle asymmetry.

---

## hook_crhook (KTX command, Voting -- Shape 7b + Shape 1c, reference card)

- **Status**: drafted
- **Source**: src/vote.c:1325
- **Catalog line**: 17978
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to crhook. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
>
> Default: n/a (vote command, not a persistent setting).
> Set by: any player via 'hook_crhook' (CTF mode, match-gated).

### Shape classification

Shape 7b (continuous toggle vote, no time-box) + Shape 1c (CTF mode precondition). Command-per-value fan-out modifier applies: this is a SHORT REFERENCE CARD in the hook family fan-out; `hook_classic` is the canonical card.

### Proposed draft

```
Casts (or withdraws) your vote to switch the grappling-hook style to crhook (k_ctf_hookstyle = 4 on pass). See hook_classic for the full vote-channel behavior.

Per-sibling delta: sets k_ctf_hookstyle to 4 on pass (not 3 as hook_classic does). This channel always uses the hardcoded 51% threshold -- k_vp_hookstyle does NOT apply to hook_crhook. An admin casting hook_crhook is treated as a veto and applies the style immediately without waiting for threshold.

Prerequisites: CTF mode must be active ("hook style can only be set in CTF mode"). Pre-match only ("hook style can not be changed while match is in progress").

Permission:  any player
Match-state: pre-match only

See also: hook_classic (canonical card -- full vote-channel behavior), k_ctf_hookstyle (state cvar set to 4 on pass), k_vp_hookstyle (threshold cvar for smooth/fast/classic channels -- does NOT apply to this command)
```

### Notes

- Reference card per canonical-card pattern. All behavioral depth (cast/withdraw cycle, broadcast, admin veto mechanics, CTF + pre-match prereqs) lives on the hook_classic canonical card. This card carries only the per-sibling delta.
- Per-sibling delta verified at vote.c:1362: `cvar_fset("k_ctf_hookstyle", 4)` on pass.
- k_vp_hookstyle asymmetry verified at vote.c:315-319: switch covers OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC with `percent = cvar("k_vp_hookstyle")`; OV_HOOKCRHOOK is absent and falls through to hardcoded `percent = 51`. This is a load-bearing behavioral asymmetry that MUST appear on this reference card.
- whovote gap (secondary finding): commands.c:2290-2348 whovote display iterates OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC tallies but not OV_HOOKCRHOOK. Players checking votes via whovote will not see crhook votes. Not included in the reference card (whovote is a separate card; this is a cross-card observation for that card's Notes) but recorded here for the apply-pass-author.
- Admin veto: `is_admins_vote(OV_HOOKCRHOOK)` at vote.c:1358 -- same veto pattern as siblings; sourced.
- See-also capped at 3 items (minimal per reference-card discipline): canonical card, state cvar, and the asymmetric threshold cvar. The asymmetric threshold cvar earns its place specifically because it does NOT apply here -- a user reading k_vp_hookstyle docs would expect it to cover all 4 hook channels; the explicit cross-reference with "does NOT apply" prevents that confusion.
- No forward references inserted. hook_classic (canonical) is an already-drafted card in this same batch.

---

## hook_fast (KTX command, Voting -- Shape 7b + fan-out modifier [REFERENCE CARD])

- **Status**: drafted
- **Source**: vote.c:1237 (handler); commands.c:918 (registration)
- **Catalog line**: 18006
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to fast. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
>
> Default: n/a (vote command, not a persistent setting).
> Set by: any player via 'hook_fast' (CTF mode, match-gated).

### Shape classification

Shape 7b (continuous toggle vote, no time-box, no yes/no) + command-per-value fan-out modifier. Short reference card pointing at hook_classic (canonical card, card 21 in this batch).

Source confirms the Shape 7b signals at vote.c:1237-1279: `self->v.hookfast = !self->v.hookfast` toggle, `G_bprint` broadcast, `get_votes_req(OV_HOOKFAST, true)` threshold check, `is_admins_vote(OV_HOOKFAST)` veto check, `cvar_fset("k_ctf_hookstyle", 2)` on pass, `vote_clear(OV_HOOKFAST)`. No time-box, no electguard, no universal yes/no. Fan-out modifier applies: this is one of 4 sibling vote commands over enum values 1-4 of `k_ctf_hookstyle`.

Per-sibling delta vs canonical (hook_classic): sets `k_ctf_hookstyle = 2` on pass (not 3). Threshold reads `k_vp_hookstyle` via the shared `OV_HOOKFAST` case at vote.c:315-319 (same as hook_smooth and hook_classic; unlike hook_crhook which falls through to hardcoded 51%). Minimum floor: `max(1, vt_req)` at vote.c:403-405 -- same as smooth and classic.

### Proposed draft

```
Casts (or withdraws) your vote to switch the grappling-hook style to fast (k_ctf_hookstyle = 2 on pass). See hook_classic for the full vote-channel behavior.

Per-sibling delta: sets k_ctf_hookstyle to 2 on pass (not 3 as hook_classic does). Threshold is controlled by k_vp_hookstyle (minimum 1 vote required). An admin casting hook_fast is treated as a veto and applies the style immediately without waiting for threshold.

Prerequisites: CTF mode must be active. Cannot be issued while a match is in progress.

Permission:    any player
Match-state:   pre-match only

See also: hook_classic (canonical card -- full vote-channel behavior), k_ctf_hookstyle (state cvar set to 2 on pass), k_vp_hookstyle (threshold)
```

### Notes

- Reference card per canonical-card pattern. All behavioral depth (cast/withdraw cycle, broadcast wording, CTF + pre-match prereqs, admin veto mechanics) lives on the hook_classic canonical card. This card carries only the per-sibling delta.
- Per-sibling delta verified at vote.c:1275: `cvar_fset("k_ctf_hookstyle", 2)` on pass.
- Threshold verified at vote.c:315-319: OV_HOOKFAST is in the switch case alongside OV_HOOKSMOOTH and OV_HOOKCLASSIC, all reading `percent = cvar("k_vp_hookstyle")`. Minimum floor verified at vote.c:403-405: `max(1, vt_req)` for OV_HOOKFAST.
- Admin veto: `is_admins_vote(OV_HOOKFAST)` at vote.c:1271 -- same veto pattern as siblings; sourced.
- See-also at 3 items: canonical card, state cvar, threshold cvar. Symmetrical with hook_crhook reference card (3 items) -- appropriate minimal See-also for a reference card with no behavioral asymmetries to call out in the threshold cvar direction (unlike crhook which needed the "does NOT apply" note).
- No forward references inserted. hook_classic (canonical) is an already-drafted card in this same batch.

---

## hook_smooth (KTX command, Voting -- Shape 7b + command-per-value fan-out modifier)

- **Status**: drafted
- **Source**: src/vote.c:1194
- **Catalog line**: 18034
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to smooth. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.
>
> Default: n/a (vote command, not a persistent setting).
> Set by: any player via 'hook_smooth' (CTF mode, match-gated).

### Shape classification

Shape 7b (continuous toggle vote) with command-per-value fan-out modifier. Reference card -- hook_classic is the canonical card for the hook family.

Source signature confirms Shape 7b at vote.c:1194-1235: `self->v.hooksmooth = !self->v.hooksmooth` toggle, `G_bprint` broadcast, `get_votes_req(OV_HOOKSMOOTH, true)` threshold check, `is_admins_vote(OV_HOOKSMOOTH)` veto check, `cvar_fset("k_ctf_hookstyle", 1)` on pass, `vote_clear(OV_HOOKSMOOTH)`. No time-box, no electguard, no universal yes/no. Fan-out modifier applies: one of 4 sibling vote commands (hook_smooth / hook_fast / hook_classic / hook_crhook) over 4 values of `k_ctf_hookstyle`.

Per-sibling delta vs canonical (hook_classic): sets `k_ctf_hookstyle = 1` on pass (not 3). Threshold reads `k_vp_hookstyle` via the shared switch case at vote.c:315-319 alongside OV_HOOKFAST and OV_HOOKCLASSIC. Minimum floor: `max(1, vt_req)` at vote.c:399-401. Unlike hook_crhook (OV_HOOKCRHOOK falls through to hardcoded 51%), hook_smooth respects `k_vp_hookstyle`.

### Proposed draft

```
Casts (or withdraws) your vote to switch the grappling-hook style to smooth (k_ctf_hookstyle = 1 on pass). See hook_classic for the full vote-channel behavior.

Per-sibling delta: sets k_ctf_hookstyle to 1 on pass (not 3 as hook_classic does). Threshold is controlled by k_vp_hookstyle (minimum 1 vote required). An admin casting hook_smooth is treated as a veto and applies the style immediately without waiting for threshold.

Prerequisites: CTF mode must be active. Cannot be issued while a match is in progress.

Permission:    any player
Match-state:   pre-match only

See also: hook_classic (canonical card -- full vote-channel behavior), k_ctf_hookstyle (state cvar set to 1 on pass), k_vp_hookstyle (threshold)
```

### Notes

- Reference card per canonical-card pattern. All behavioral depth (cast/withdraw cycle, broadcast wording, CTF + pre-match prereqs, admin veto mechanics) lives on the hook_classic canonical card. This card carries only the per-sibling delta.
- Per-sibling delta verified at vote.c:1231: `cvar_fset("k_ctf_hookstyle", 1)` on pass.
- Threshold verified at vote.c:315-319: OV_HOOKSMOOTH is in the shared switch case alongside OV_HOOKFAST and OV_HOOKCLASSIC, all reading `percent = cvar("k_vp_hookstyle")`. Minimum floor verified at vote.c:399-401: `max(1, vt_req)` for OV_HOOKSMOOTH.
- Admin veto: `is_admins_vote(OV_HOOKSMOOTH)` at vote.c:1227 -- same veto pattern as siblings; sourced.
- See-also at 3 items: canonical card, state cvar, threshold cvar. Minimal reference card; no behavioral asymmetries to call out beyond the per-sibling delta.
- No forward references inserted. hook_classic (canonical) is an already-drafted card in this same batch.

---

## next_map (KTX command, Voting -- Shape 7b + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:995
- **Catalog line**: 18062
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts a vote to end the current map and cycle to the next one. Call again to withdraw your vote. Blocked if the server has disabled map voting (k_no_vote_map). Available before, during, and after a live match.
>
> Set by: any player ('next_map' in-game).

### Shape classification

Shape 7b (continuous toggle vote) + Shape 4 gate (k_no_vote_map).

`next_map` shares the `PlayerBreak` handler with `break`, but is registered `CF_PLAYER | CF_MATCHLESS_ONLY` -- matchless mode only, players only. Inside the handler: `self->v.brk` is the per-player vote flag (toggle pattern); `get_votes_req(OV_BREAK, true)` reads `k_vp_map` as the threshold (not `k_vp_break`) when matchless mode is active; `vote_check_break()` applies the pass effect (`EndMatch(0)`). The `k_no_vote_map` check at match.c:3021 blocks the vote path when that cvar is non-zero (Shape 4 gate, inverted polarity). No admin-veto: `is_admins_vote(OV_BREAK)` is not called anywhere in vote.c.

### Proposed draft

```
Casts (or withdraws) your vote to end the current matchless session and cycle to the next map.

Effect:
  Toggles your vote on the map-cycle channel (OV_BREAK): re-running withdraws.
  Broadcasts running tally to all players. When the player threshold is met
  (per k_vp_map), the server ends the match and cycles to the next map.

Prerequisites:
  k_no_vote_map must be 0 (disabled) -- the server prints "Voting next map is
  not allowed" and the vote is rejected when it is set.
  Requires matchless mode to be active (command not available in standard
  match mode).
  The match must be in progress -- if no match is running, the command
  unreadies you instead of casting a vote.

Permission:    any player (matchless mode only; spectators are blocked)
Match-state:   mid-match only (matchless session must be running)

Example:
  next_map          (casts vote; server prints "<you> votes for next map (N needed)")
  next_map          (re-run withdraws; server prints "<you> withdraws his vote")

See also: break (sibling vote on the OV_BREAK channel; same PlayerBreak handler -- next_map is the CF_MATCHLESS_ONLY variant), k_vp_map (threshold cvar; matchless OV_BREAK reads k_vp_map, same cvar that governs the OV_MAP path used by votemap+cm), k_no_vote_map (Shape 4 gate blocks next_map and matchless break), votemap (related map-area vote on the OV_MAP channel; shares the k_vp_map threshold across channels)
```

### Notes

- FLAG: existing description says "Available before, during, and after a live match" -- source contradicts this. `CF_MATCHLESS_ONLY` (commands.c:995) restricts next_map to matchless mode entirely. Within matchless mode, `!match_in_progress` at match.c:3029 causes the handler to unready the player instead of casting a vote, so the vote only fires during an active matchless match. The match-state claim in the existing description is wrong; corrected in the v2 draft to "mid-match only (matchless session must be running)."
- Threshold cvar is `k_vp_map` (not `k_vp_break`): verified at vote.c:244-246 -- the switch case for `OV_BREAK` reads `k_vp_map` when `k_matchLess` is true. This is the critical detail from the k_vp_break sub-agent context note.
- Minimum vote floor: `max(2, vt_req)` applies when `k_matchLess && match_in_progress == 1` (countdown phase, vote.c:371-373); otherwise standard `max(1, vt_req)` applies. Not surface-worthy in L1 (internal to threshold arithmetic); the user-facing signal is the broadcast tally.
- No admin-veto path confirmed: `is_admins_vote(OV_BREAK)` is absent from vote.c. This differs from pickup, teamoverlay, hookstyle, antilag, etc. which all have admin-veto paths.
- The `self->ready` check at match.c:3006 means a player who joined mid-match without issuing `ready` cannot cast a vote (silent return). Minor edge case; not included in main card prose but flagged here for apply-pass awareness.
- `break` in matchless mode routes through the same OV_BREAK / `self->v.brk` channel. `next_map` is the matchless-only alias -- `break` is available in both modes (`CF_MATCHLESS`); `next_map` is matchless-only (`CF_MATCHLESS_ONLY`). The k_vp_break sub-agent context note confirms this redirect.
- See-also at 3 items: threshold cvar, gate cvar, sibling vote. No forward references. `cm` is already drafted in this batch; `k_vp_map` and `k_no_vote_map` are both drafted in this batch.

---

## no (KTX command, Voting -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:802 (registration), src/vote.c:143 (VoteNo handler)
- **Catalog line**: 18089
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Withdraws your previously-cast vote. Applies to generic votes and admin elections started with /elect. Does nothing if you have no active vote or no vote is currently in progress. Companion to the 'yes' command.
>
> Set by: any player ('no' in-game).

### Shape classification

shape-less (Layer B).

`no` is the universal vote-withdrawal lever for the `OV_ELECT` channel (Shape 7a elections). The Shape 7a relationship tag lives on the election starters (`elect`, `captain`, `coach`, `suggestcolor`) -- each starter's card cross-links `yes`/`no`. The `no` card itself has no own inter-entity relationship to classify under Layer B; it is a service command consumed by multiple election starters. Consistent with the lever / leaf discipline in the shape-catalog: shape tag lives on the cvar/starter; the command lever is shape-less.

Source verification: `VoteNo` at vote.c:143 is hard-coded to `OV_ELECT` only. It never touches Shape 7b vote channels (OV_ANTILAG, OV_MAP, OV_NOSPECS, etc.) -- those use per-command toggle mechanics entirely separate from `yes`/`no`. CF_PLAYER | CF_MATCHLESS: any player, any time (no match-state gate).

### Proposed draft

```
Withdraws your previously-cast approval vote from the current election.

Effect:
  Clears your vote from the active election (set by a prior 'yes'). All
  players are notified of the withdrawal and the updated vote count is
  broadcast. Does nothing silently if any of these hold: no election is
  currently active; you have not yet cast a 'yes' vote; you are the player
  being elected.

Permission:    any player
Match-state:   any time (elections run regardless of match phase)

Example:
  yes           ; cast your approval
  no            ; change your mind and withdraw it

See also: yes (companion approval command), elect (admin election starter), captain (captain election starter), coach (coach election starter), suggestcolor (color-suggestion election starter)
```

### Notes

- FLAG: existing description scopes `no` to "generic votes and admin elections started with /elect" -- this is too narrow. `VoteNo` operates on the `OV_ELECT` channel which services ALL Shape 7a election types: admin (via `elect`), captain (via `captain`), coach (via `coach`), color suggestion (via `suggestcolor`), and late-join elections. The existing framing implies `no` only applies when `elect` is the starter. The v2 draft corrects this to cover all election types without naming each in the prose (See-also covers the starters).
- FLAG: existing description omits the "you are the candidate" silent-return path. `VoteNo` at vote.c:148 returns silently when `self->v.elect_type != etNone` (caller is the player being elected). This is user-observable: if you start an election via `elect` and then type `no`, nothing happens. Surfaced in the v2 Effect bullet ("you are the player being elected").
- shape-less verdict confirmed: the dispatch note's pre-analysis was correct. VoteNo is the pure service command for OV_ELECT; no own Layer B relationship shape applies.
- See-also at 5 items: `yes` (pair), `elect` + `captain` + `coach` + `suggestcolor` (the four Shape 7a starters that produce elections this command services). Exactly at the 4-5 cap. `latejoin` (another election type visible in vote.c:291-295) is not in See-also because it is not separately dispatched by name in the catalog -- it is a sub-type of the `elect` election family. No forward references; all See-also entities are already drafted or are existing batch cards.
- Match-state: CF_MATCHLESS means no gate. Elections themselves can run outside live matches (e.g. admin elections during pre-match warmup). "Any time" is correct; the Match-state line is omitted per v2 discipline (omit when "any time").

---

## pickup (KTX command, Voting -- Shape 7b)

- **Status**: drafted
- **Source**: src/commands.c:754
- **Catalog line**: 18116
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the calling player's vote for a pickup game. Broadcasts "pickup!" or "no pickup" to all players, plus the remaining votes required when applicable. Has no effect during a live match, and is rejected while captain team-picking is active.
>
> Set by: any player via 'pickup'.

### Shape classification

Shape 7b: continuous toggle vote (no time-box, no yes/no approval). Handler toggles `self->v.pickup` per-player flag, broadcasts running tally via `G_bprint`, checks `get_votes_req(OV_PICKUP, true)` via `vote_check_pickup()`. No `electguard`, no timeout. Paired threshold cvar: `k_vp_pickup`. No additional Shape 4 enable-gate cvar in the handler (the `k_captains` gate is a runtime state variable, not a Shape 4 gate cvar relationship).

### Proposed draft

```
Casts (or withdraws) your vote to start a pickup game.

Effect:
- Toggles your pickup vote on or off. Broadcasting to all players: "<name> says pickup!" (when cast) or "<name> says no pickup" (when withdrawn), followed by the remaining votes still needed if any.
- Re-running the command withdraws your vote.
- When the threshold is met (or any admin who has voted triggers an immediate pass), all players on the server have their color, team, and skin reset to defaults -- clearing existing team assignments to start fresh.
- Admin who has cast a pickup vote causes the vote to pass immediately ("admin veto for pickup"), regardless of how many other votes are in.

Prerequisites: Captain team-picking must not be active ("No pickup when captain stuffing").

Permission:    any player
Match-state:   pre-match only

Example:
  pickup          ; cast your vote -- or withdraw if already cast
  pickup          ; (second call from same player withdraws the vote)

See also: k_vp_pickup (threshold percentage), rpickup (random-team pickup sibling)
```

### Notes

- The on-pass team-clearing effect (`break\ncolor 0\nteam ""\nskin base\n` stuffed to all players) is absent from the existing description. It is the primary user-observable outcome of the vote passing and must appear in the v2 Effect. Source: `vote.c:753-759`.
- Admin-veto behavior: `is_admins_vote(OV_PICKUP)` at `vote.c:738` triggers immediate pass when any admin has cast a pickup vote. The broadcast text ("admin veto for pickup") is confusingly labeled but the effect is a forced pass, not a block. The v2 draft surfaces this as an Effect bullet because it changes when the vote resolves.
- No explicit minimum-vote floor for OV_PICKUP (unlike rpickup which has `max(3, vt_req)` at `vote.c:381`). On a 1-player server, `ceil(0.51 * 1) = 1` -- a single player can pass the vote unilaterally. This is user-surprise territory but is an emergent property of the threshold math, not a distinct mechanic. Surfaced implicitly via the "when the threshold is met" framing (threshold at default 51% of connected players).
- Match-state: `match_in_progress` early-return at `commands.c:2541` is silent (no print). Existing description says "has no effect" which is accurate. The v2 Match-state line captures this as "pre-match only".
- Captain-stuffing gate: `k_captains` is a float runtime counter (nonzero when at least one captain is elected). The gate at `commands.c:2546` fires on any nonzero value.
- See-also capped at 2 items: `k_vp_pickup` (paired threshold cvar) and `rpickup` (sibling pickup variant, named in the operator context note). `nospecs` and `k_teamoverlay` are not related. No forward references; both See-also entities are either an existing L1 entity or a command in this batch by name.

---

## suggestcolor (KTX command, Voting -- Shape 7a)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:805 (handler: vote.c:1679)
- **Catalog line**: 18143
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Starts an election proposing that one or more players change their shirt/pants color. Usage: `suggestcolor <top> <bottom> <name or id>...`. Color values are clamped to 0-16. Requires 3 or more players, no other election running, and the caller must be off cooldown. Players cannot target themselves; spectators cannot initiate during a live match. Running it again while your own election is active aborts it.
>
> Set by: any in-game player (or admin spectator outside live match).

### Shape classification

Shape 7a (election starter command). Handler spawns an `electguard` think-entity with a 60-second timeout (`vote.c:1793`), sets `self->v.elect_type = etSuggestColor`, and routes approval through the universal `yes`/`no` commands. Threshold is read from `k_vp_suggestcolor` at vote-tally time (`vote.c:288`). Minimum 2 votes for any OV_ELECT election regardless of player count (`vote.c:369`). No enable-gate cvar (no Shape 4 composition). No mode-precondition (no Shape 1c). Clean single-shape match.

### Proposed draft

```
Starts a color suggestion election, proposing that named players change their shirt and pants color.

Effect:
  Broadcasts the request and opens a 60-second vote window. Other players type yes to approve; the election passes when approvals reach the k_vp_suggestcolor threshold (minimum 2 votes regardless of player count).
  On pass: each target receives a color change -- but only if no match is in progress when the threshold is reached. If a match is running when the vote passes, the color change is skipped.
  Re-running while your own election is pending aborts it (broadcasts "aborts election" and ends the vote window).

Prerequisites:
  At least 3 players connected.
  No other election currently running (admin, captain, coach, or color election).
  Caller must be off cooldown (30 seconds after any election ends).
  Cannot target yourself; all named targets must be connected -- if any name is not found, the election is cancelled before it starts.

Permission:    any in-game player
Match-state:   any time (on-pass color application skipped if a match is in progress when the vote passes)

Example:
  suggestcolor 4 14 FooPlayer
  suggestcolor 4 14 FooPlayer BarPlayer

  (First arg = top/shirt color 0-16; second = bottom/pants color 0-16; remaining args = player names or IDs. Multiple targets allowed.)

See also: k_vp_suggestcolor (approval threshold), yes (casts approval), no (withdraws approval), elect (sibling election starter)
```

### Notes

- FLAG: Existing description's "Set by" line claims "admin spectator outside live match" is a valid invoker. Source registration is `CF_PLAYER | CF_PARAMS` -- no `CF_SPECTATOR` or `CF_SPC_ADMIN`. The handler's spectator guard at `vote.c:1685` (`if (self->ct == ctSpec && match_in_progress) return`) is belt-and-suspenders; it doesn't extend the command to spectators who aren't already routing through `CF_PLAYER`. Permission is **any in-game player** only. The existing description's spectator clause is inaccurate and has been dropped from the v2 draft.
- On-pass match-state skip: `SuggestColorApply()` is called only when `!match_in_progress` (`vote.c:699-703`). In-game players can start the election during a live match (no handler-level block for players), but colors won't apply if the vote resolves mid-match. Surfaced as a Match-state qualifier in the v2 draft -- user-surprise behavior not in the existing description.
- Target-not-found abort: if any named player is not connected (`player_by_IDorName()` returns NULL at `vote.c:1736`), the election is cancelled before starting with a broadcast message. Surfaced in Prerequisites -- user-surprise when targeting multiple players.
- Cooldown source: `elect_block_till` is set by `AbortElect()` (`vote.c:62`) to `time + 30` for all players after any election ends (pass, abort, or timeout). The 30-second cooldown is post-election global, not per-player-specific to the initiator.
- The existing description is otherwise accurate; contradictions are localized (spectator permission claim) rather than foundational.

---

## swapall (KTX command, Voting -- Shape 7b + Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:925 (handler: SwapAll at ~6637; vote check: vote.c:1620)
- **Catalog line**: 18170
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts or withdraws the calling player's vote to swap all players to opposing teams. Once enough players vote, all players are swapped between the two teams. Each call toggles the caller's vote and broadcasts the running tally. CTF-only; unavailable during a live match or while captain/coach team-picking is active.
>
> Set by: any CTF player (no arguments).

### Shape classification

Shape 7b (continuous toggle vote) + Shape 1c composition (CTF mode-precondition).

Handler toggles `self->v.swapall` (per-player flag), broadcasts running tally via `G_bprint` + `get_votes_req(OV_SWAPALL, true)`, calls `vote_check_swapall()` -- no `electguard`, no time-box. Classic Shape 7b. CTF-only gate via `!isCTF()` early-return adds the Shape 1c mode-precondition facet.

### Proposed draft

```
Casts (or withdraws) your vote to swap red and blue teams wholesale in a CTF match.

Effect:
  - Toggles your swapall vote on or off and broadcasts the running tally.
  - When enough votes are cast, every blue-team player moves to red and every red-team player moves to blue. Colors update automatically (red=4, blue=13).
  - An admin can veto the vote at any time before the threshold is reached; the vote then clears without executing the swap.
  - Re-running the command withdraws your vote.

Prerequisites:
  - CTF mode must be active.
  - Captain-pick and coach-pick phases block this vote ("No swapall when captain stuffing" / "No swapall when coach stuffing").
  - At least 3 player votes are required regardless of threshold percentage (the highest minimum floor in KTX).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  swapall         (casts your vote; tally broadcasts to all)
  swapall         (second call -- withdraws your vote)

See also: k_vp_rpickup (shared approval threshold), rpickup (sibling sharing the same threshold)
```

### Notes

- FLAG: Existing description's "Set by" line says "any CTF player" -- registration is `CF_PLAYER | CF_SPC_ADMIN`, so admin spectators can also cast a swapall vote. The v2 draft corrects this to "any player or admin spectator".
- Threshold sharing: `swapall` reads `k_vp_rpickup` at vote-tally time (`vote.c:252-254` -- "don't need a dedicated 'swapall' percentage"). Not mentioned in the existing description; surfaced in See-also.
- Min-3 floor: `vote.c:379-381` applies `max(3, vt_req)` for both `OV_RPICKUP` and `OV_SWAPALL` -- the highest floor in KTX. Surfaced in Prerequisites as a user-surprise condition.
- On-pass swap mechanics: `vote_check_swapall()` iterates all players and stuffcmds each player to switch team + color. Blue players get `team "red"\ncolor 4`; red players get `team "blue"\ncolor 13`. The existing description says "swapped between the two teams" which is correct but undersells the determinism -- this is a strict left-right flip, not a shuffle (unlike `rpickup`).
- Admin veto: `is_admins_vote(OV_SWAPALL)` check in `vote_check_swapall()` allows an admin voter to clear the vote with a broadcast "Admin veto for Swapall". Not mentioned in the existing description; surfaced in Effect.
- No `CF_MATCHLESS` flag on registration; `match_in_progress` is also checked inside the handler, consistent with pre-match-only behavior.

---

## teamoverlay (KTX command, Voting -- Shape 7b)

- **Status**: drafted_with_flag
- **Source**: src/vote.c:1073
- **Catalog line**: 18197
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Votes to toggle the server's team-overlay HUD permission (k_teamoverlay). Each call casts or withdraws the player's vote and broadcasts the running count; once enough votes are collected, the setting flips.
>
> During a live match: reports the current state only (no vote cast).
> Non-admin: requires at least 2 players present to vote.
> Admin: may toggle the setting directly.
>
> Set by: any player command (/teamoverlay).

### Shape classification

Shape 7b (continuous toggle vote, no time-box).

Handler toggles `self->v.teamoverlay` (per-player vote flag), broadcasts via `G_bprint`, checks `get_votes_req(OV_TEAMOVERLAY, true)`, and fires `vote_check_teamoverlay()` on each toggle. No `electguard`, no timeout -- the vote stays open continuously. On pass: `cvar_fset("k_teamoverlay", !cvar("k_teamoverlay"))`. Admin-veto path (`is_admins_vote()`) is the standard Shape 7b admin mechanic seen across KTX votes. No Shape 4 gate (no `if (!cvar("k_X"))` early-return in the handler). No mode-precondition. Straightforward single-facet Shape 7b.

### Proposed draft

```
Casts (or withdraws) your vote to toggle the team overlay on or off (k_teamoverlay).

Effect:
  - Toggles your personal vote flag and broadcasts a running tally to all players.
  - When the required share of player votes is reached, k_teamoverlay flips and
    "Teamoverlay on/off by majority vote" is broadcast.
  - An admin's vote is sufficient on its own -- "Teamoverlay on/off by admin veto"
    broadcasts immediately.
  - Re-running the command withdraws your vote.
  - During a live match: prints the current teamoverlay state and returns without
    casting a vote.

Prerequisites: At least 2 player votes are required to pass regardless of the
k_vp_teamoverlay percentage threshold. Non-admin players also need at least 2
players present before voting is accepted.

Permission:    any player or admin spectator
Match-state:   pre-match only (vote cast); any time (state report during live match)

Example:
  teamoverlay     (casts your vote; tally broadcasts to all players)
  teamoverlay     (second call -- withdraws your vote)

See also: k_vp_teamoverlay (approval threshold for this vote), k_teamoverlay (state cvar toggled on pass -- Server-config batch), nospecs (sibling Shape 7b pre-match vote)
```

### Notes

- FLAG: Existing description says "Admin: may toggle the setting directly." Source shows no separate direct-toggle path. The admin issues the same `teamoverlay` command; `is_admins_vote(OV_TEAMOVERLAY)` in `vote_check_teamoverlay()` detects the admin voter and executes the toggle immediately as a veto, bypassing the threshold check. The practical outcome is identical (admin's single vote is sufficient), but "directly" implies a distinct code path that doesn't exist. The v2 draft reframes as "An admin's vote is sufficient on its own."
- Min-2 floor: `vote.c:391` applies `max(2, vt_req)` for OV_TEAMOVERLAY. This is separate from the `CountPlayers() < 2` handler-side guard (`vote.c:1088-1092`). Both enforce 2 as a minimum; the description merged them into one clause. The v2 draft splits them into a Prerequisites entry (votes required) and a condition within that same bullet (players present).
- The overlay has visible effect only in team/CTF modes (not duel/race -- `match.c:1639`); the vote itself has no mode gate. This belongs on the k_teamoverlay state cvar card, not here.
- See-also references `nospecs` (Spectator chat batch, also Shape 7b) as a sibling pre-match continuous toggle vote for discoverability parity.
- Bidirectional See-also with k_teamoverlay: the Server-config batch drafted k_teamoverlay (Shape 7b state cvar) with a reference to this command. This card returns the cross-link as specified in the dispatch instructions.

---

## votecoop (KTX command, Voting -- Shape 7b)

- **Status**: drafted
- **Source**: src/commands.c:1041 (registration); src/vote.c:1165 (handler)
- **Catalog line**: 18228
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts (or withdraws, if already cast) the calling player's vote to toggle cooperative mode on or off. Broadcasts the vote and the remaining count needed. Refused while a deathmatch match is in progress.
>
> When the required majority is reached (or an admin vetoes), the server flips the coop and deathmatch cvars and reloads the level. The map loaded depends on state: a matchless usermode config for the current map if available, bloodfest's default map under bloodfest, otherwise "start" when enabling coop or the current map when disabling.
>
> Set by: any player (in-game command 'votecoop', outside a live match).

### Shape classification

Shape 7b: Continuous toggle vote (no time-box, no yes/no).

Handler toggles `self->v.coop` (per-player vote flag), broadcasts via `G_bprint`, checks `get_votes_req(OV_COOP, true)` using `k_vp_coop` threshold. No `electguard` / no timeout / no universal `yes`/`no` involvement. The vote is over a binary state (coop ON vs OFF), not a multi-value enum -- no command-per-value fan-out modifier applies. The refusal condition is the handler's own `deathmatch && match_in_progress` early-return, not a Shape 4 gating cvar.

### Proposed draft

```
Casts (or withdraws) your vote to toggle cooperative mode on or off.

Effect:
  Flips your per-player coop vote and broadcasts the current tally (remaining
  votes needed shown in parentheses).
  On pass (threshold met or admin single-vote veto): toggles the `coop` and
  `deathmatch` engine cvars and reloads the map.
  Map reloaded on pass depends on state:
    - Enabling coop + matchless config exists for current map: executes that
      config and reloads the current map.
    - Bloodfest active + enabling coop: reloads the current map.
    - Bloodfest active + disabling coop: reloads `k_defmap`.
    - Otherwise: enabling coop loads "start"; disabling coop reloads the
      current map.

Prerequisites: Refused during a live deathmatch match ("Match in progress and
deathmatch is non zero, you can't vote for coop").

Permission:    any player
Match-state:   blocked during a live deathmatch match (pre-match and coop-match
               invocations are accepted)

Example:
  votecoop     (casts your vote to flip coop; tally broadcasts to all players)
  votecoop     (second call -- withdraws your vote)

See also: k_vp_coop (approval threshold for this vote), coop (engine state cvar toggled on pass -- mvdsv), nospecs (sibling Shape 7b continuous toggle vote)
```

### Notes

- The existing description is accurate and well-structured at the behavioral level. The v2 recast clarifies the bloodfest branch (existing text says "bloodfest's default map under bloodfest" which conflates enable and disable sub-cases; source shows enabling coop under bloodfest reloads current mapname, disabling reloads `k_defmap`).
- The refusal condition is `deathmatch && match_in_progress` (vote.c:1169) -- not a plain match-in-progress block. If the server is already in coop mode and running a coop match (deathmatch=0), the vote is NOT refused by this check. The Match-state line reflects this nuance.
- Minimum vote floor for OV_COOP is 1 (`max(1, vt_req)` at vote.c:395-397), lower than the 2-vote floor applied to OV_TEAMOVERLAY / OV_NOSPECS. Not action-plan-changing for players; omitted from L1 (server-config detail for the threshold cvar card).
- Registration: `CF_PLAYER | CF_MATCHLESS` -- players only (no spectators), valid in matchless mode.
- `coop` is an engine-level (mvdsv) cvar, not a KTX k_* entity; cited by name only in See-also.
- See-also `nospecs` reference: Spectator chat batch, Shape 7b, confirmed valid per batch dispatch notes (no-forward-reference rule satisfied).

---

## voteprivate (KTX command, Voting -- Shape 7b + Shape 4)

- **Status**: drafted_with_flag
- **Source**: vote.c:1497
- **Catalog line**: 18257
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts (or withdraws) your vote to toggle private-game mode. Broadcasts your vote and the remaining count needed. When the threshold is reached the server enables or disables private game, restricting connections based on the k_privategame_allow_specs setting. An admin's single vote can switch it directly.
>
> Refused if: private game is not voteable on this server, a match is in progress, you are not logged in (required to vote it on), or fewer than two non-bot players are present.
>
> Set by: any player (in-game command; voteable server required).

### Shape classification

Shape 7b + Shape 4.

`voteprivate` is a continuous toggle vote: `self->v.privategame` is toggled per-player, tally is broadcast via `G_bprint`, pass is checked via `get_votes_req(OV_PRIVATE, true)`, and on pass `private_game_toggle()` is called. No time-box, no universal yes/no. This is the standard Shape 7b signature. The Shape 4 gate is `k_privategame_voteable`: the handler reads `private_game_voteable()` -> `cvar("k_privategame_voteable")` and refuses with "Private game not enabled on this server" if 0.

### Proposed draft

```
Casts (or withdraws) your vote to toggle private-game mode.

Effect:
  - Toggles your private-game vote on or off. Re-running withdraws your current vote (the standard cast/withdraw cycle).
  - Broadcasts your vote and the number of remaining votes needed to pass.
  - When the threshold is reached, enables or disables private game: sets k_privategame accordingly and adjusts connection requirements based on k_privategame_allow_specs.
  - An admin's single vote passes immediately without needing the threshold.

Prerequisites:
  - k_privategame_voteable must be enabled on this server.
  - Voting to enable private game requires you to be logged in. Voting to revert to public game does not.
  - At least 2 non-bot players must be present (minimum vote floor for this vote type). Admins bypass the player-count check.

Permission:    any player
Match-state:   pre-match only (mid-match: reports current private-game state, vote has no effect)

Example:
  voteprivate     (casts your vote to flip private game; tally broadcasts to all players)
  voteprivate     (second call -- withdraws your vote)

See also: k_vp_privategame (approval threshold for this vote), k_privategame_voteable (gate cvar -- must be 1 to use this command), k_privategame (state cvar toggled on pass), k_privategame_allow_specs (scope cvar controlling connection requirements on pass)
```

### Notes

- FLAG: Existing description says "Refused if: ... a match is in progress." Source (`vote.c:1509-1513`) does not refuse with an error -- it prints current state ("Private game mode ON/OFF") as an informational message and returns. The user still cannot affect the vote mid-match, but the framing "refused" is inaccurate. The v2 recast uses "reports current state, vote has no effect" instead.
- The login prerequisite is directional: `!enabled && !is_logged_in(self)` -- login is required only when voting private-ON (when private game is currently off). Voting to revert to public (when private is on) does not require login. The existing description captures this correctly ("required to vote it on"); the v2 recast preserves the distinction explicitly.
- Min-vote floor for OV_PRIVATE is `max(2, vt_req)` (vote.c:415-417) -- hard minimum of 2 votes regardless of threshold percentage. The single-player-with-bot override that applies to other vote types explicitly excludes OV_PRIVATE (vote.c:420).
- Admin veto/force: `is_admins_vote(OV_PRIVATE)` in `vote_check_privategame()` -- admin's single vote passes the check without threshold. Confirmed in source.
- On-pass side effects: `private_game_toggle()` also sets `sv_login` (1 if specs allowed, 2 if not) and optionally kicks/force-specs non-logged players based on `k_privategame_force_reconnect`. These are downstream engine effects; omitted from L1 per action-level discipline. The user-observable outcome is "private game enabled, requires login to connect/play" which is what the description covers.
- Registration: CF_PLAYER -- any player (not admin-only). Confirmed at commands.c:1060.
- See-also cap: 4 entries (threshold + gate + state + scope). At limit; no concept note cross-link added.

---
## whovote (KTX command, Voting -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:716 (registration); src/commands.c:2082-2358 (handler: ModStatusVote)
- **Catalog line**: 18286
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the status of all currently active votes and elections to the caller. Shows each open category (map vote, captain/admin election, pickup, break, antilag, no-specs, teamoverlay, private game, swapall, hook-style) with the current count, votes required, and who voted. Prints "No election going on" when nothing is active. Some categories are hidden depending on match state.
>
> Set by: any player or spectator.

### Shape classification

shape-less (pure standalone state-printer).

`whovote` calls `ModStatusVote`, which iterates vote/election state across all open channels and prints the tally to the caller via `G_sprint`. No cvar is toggled, no vote flag is set, no inter-entity dispatch occurs. The entity has no inter-entity relationship of the kind the Layer B catalog captures (no cvar+toggle pair, no election/gate/threshold pair, no sibling family with shared mechanism). Identical in role to `about` or `status1`.

### Proposed draft

```
Prints the current vote and election tally to you -- who has voted for what, and how many votes each open channel still needs to pass.

Effect:
  - For each active vote or election channel, prints: the channel label, the
    current vote count vs. votes required, and the name of each player who
    has voted.
  - Channels printed (when active and match-state conditions met):
      map vote          -- shown pre-match or in matchless mode
      admin/coach/captain election -- captain election suppressed during a live match
      pickup            -- pre-match only
      rpickup           -- pre-match only
      break             -- "next map" label in matchless mode; "stopping" label mid-match
      antilag           -- pre-match only
      no spec           -- pre-match only
      teamoverlay       -- pre-match only
      private/public game -- pre-match only; label is "public game" when sv_login is set
      swapall           -- pre-match only
      hook smooth       -- pre-match only
      hook fast         -- pre-match only
      hook classic      -- pre-match only
  - If no channel is active, prints "No election going on".
  - hook_crhook votes are NOT shown even when active (source omission -- see Notes).

Permission:    any player or spectator
Match-state:   any time

Example:
  whovote     (prints current tally; or "No election going on" if nothing is active)

See also: elect (starts admin/coach/captain elections), votemap (map-selection vote), antilag (antilag vote), nospecs (no-spec vote), k_teamoverlay (teamoverlay state cvar)
```

### Notes

- FLAG: Existing description lists "hook-style" as a single category. Source has three separate hook-style vote channels (OV_HOOKSMOOTH, OV_HOOKFAST, OV_HOOKCLASSIC), each independently enumerated. hook_crhook (OV_HOOKCRHOOK) is entirely absent from ModStatusVote -- not enumerated at lines 2082-2358. A player who has voted hook_crhook will NOT appear in the whovote tally. The existing description's "hook-style" phrasing implies crhook is covered; it is not. The v2 draft surfaces this explicitly as a behavioral omission.
- FLAG: Existing description says "10 categories". Source has 13 distinct category checks (map vote / election / pickup / rpickup / break / antilag / no-specs / teamoverlay / private game / swapall / hook_smooth / hook_fast / hook_classic). The existing description merged rpickup with pickup (they are separate OV_ channels at lines 2155-2172) and collapsed the three hook variants into one. The v2 draft enumerates all 13.
- FLAG: "break" channel label is context-sensitive: in matchless mode it prints "next map" (line 2182: `k_matchLess ? "next map" : "stopping"`); during a live match it prints "stopping". The existing description doesn't surface this.
- FLAG: "private game" label flips: when `sv_login` is set, the channel label becomes "public game" (line 2263: `enable ? redtext("private game") : redtext("public game")` where `enable = !cvar("sv_login")`). The existing description doesn't surface this.
- Registration: CF_BOTH | CF_MATCHLESS -- players and spectators, available in matchless mode. Confirmed at commands.c:716.
- CF_MATCHLESS means the command is explicitly available in matchless-mode servers (where the standard command permission filter would otherwise exclude it). It does not restrict to matchless-only; CF_MATCHLESS_ONLY is a separate flag (g_local.h:657).
- ModStatusVote has no match_in_progress early-return at the top -- the command is callable at any match state. Individual channel blocks have their own `!match_in_progress` conditions controlling which channels appear.
- See-also cap: 5 entries (most-used vote entry-points + teamoverlay cross-batch). No concept note cross-link added (no existing note for voting system).

---

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

## Cross-card consistency notes

Sweep date: 2026-05-26. Sonnet 4.6 high reasoning. Source verified against KTX `v1.36-1633-g67253dc`.

---

### Finding 1 -- swapall admin-veto Effect incorrectly says swap is NOT executed (swapall)

**Cards affected**: swapall.

The proposed draft Effect bullet reads: "An admin can veto the vote at any time before the threshold is reached; the vote then clears without executing the swap."

**What source says**: `vote_check_swapall()` at `vote.c:1620-1661`. The code structure is:

```c
if (veto || !get_votes_req(OV_SWAPALL, true)) {
    vote_clear(OV_SWAPALL);
    if (veto) G_bprint("Admin veto for Swapall");
    else G_bprint("Majority vote for Swapall");
    for (p = ...) { swap teams }   // for-loop is inside the same block
}
```

The team-swap for-loop runs unconditionally inside the `if (veto || !get_votes_req(...))` block, regardless of whether the branch was entered via veto or via majority threshold. The swap IS executed on admin veto. The draft's "without executing the swap" is factually wrong. The correct framing is: an admin vote causes the vote to resolve immediately (same on-pass effect as a threshold pass: teams are swapped and votes are cleared).

**Apply-pass correction**: Replace "An admin can veto the vote at any time before the threshold is reached; the vote then clears without executing the swap." with: "An admin's vote causes the swap to execute immediately -- 'Admin veto for Swapall' is broadcast, votes are cleared, and all players are moved to opposite teams (same effect as a threshold pass)."

---

### Finding 2 -- k_vp_hookstyle Effect says "three channels" for admin veto but hook_crhook also has it (k_vp_hookstyle, hook_crhook)

**Cards affected**: k_vp_hookstyle (Effect section), hook_crhook (Notes cross-checks admin veto correctly).

The k_vp_hookstyle proposed draft Effect bullet reads: "A single admin vote passes any of the three hook-style channels immediately (admin veto path)."

The same card's Notes section correctly states: "`is_admins_vote(OV_HOOK*)` applies to all 4 hook handlers. A single admin vote immediately passes the channel."

**What source says**: `is_admins_vote(OV_HOOKCRHOOK)` at `vote.c:1358` is called inside the `hookcrhook()` handler. The pass condition is `if (veto || !get_votes_req(OV_HOOKCRHOOK, true))` at line 1360. Admin veto applies to all 4 channels, not just the 3 governed by `k_vp_hookstyle`.

This is an internal inconsistency within the k_vp_hookstyle card: the Effect prose says "three" while the Notes say "all 4". The hook_crhook card is consistent with source (Notes confirm admin veto via `is_admins_vote(OV_HOOKCRHOOK)` at vote.c:1358).

**Apply-pass correction**: In k_vp_hookstyle's Effect section, change "A single admin vote passes any of the three hook-style channels immediately (admin veto path)." to "A single admin vote passes any hook-style vote channel immediately (admin veto path). This includes hook_crhook even though that channel does not read k_vp_hookstyle for the threshold."

---

### Finding 3 -- Shape 1c header tag inconsistency across hook sibling cards (hook_crhook vs hook_fast / hook_smooth)

**Cards affected**: hook_crhook (section header), swapall (section header); hook_fast (header), hook_smooth (header), hook_classic (header).

The section headers are:

```
hook_classic: "Shape 7b + fan-out modifier [CANONICAL CARD]"   -- no Shape 1c in header
hook_crhook:  "Shape 7b + Shape 1c, reference card"           -- Shape 1c in header
hook_fast:    "Shape 7b + fan-out modifier [REFERENCE CARD]"   -- no Shape 1c in header
hook_smooth:  "Shape 7b + command-per-value fan-out modifier"  -- no Shape 1c in header
swapall:      "Shape 7b + Shape 1c"                           -- Shape 1c in header
```

All four hook commands (smooth / fast / classic / crhook) have the identical CTF mode-precondition enforced inside their handlers (`if (!isCTF()) return`). The canonical card (hook_classic) moves Shape 1c into Notes only ("Shape 1c (mode-precondition: CTF required) also applies"). hook_fast and hook_smooth match the canonical card's pattern. hook_crhook alone carries "Shape 1c" in its section header, creating a visual asymmetry with its siblings.

For swapall: it is not part of the hook family and the CTF mode-precondition is legitimately a structural facet of that command. The Shape 1c tag on swapall is well-founded per the facets-not-buckets principle established in the shape catalog (`apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog-findings.md:1739`). The asymmetry is specifically the hook_crhook header vs hook_fast / hook_smooth / hook_classic headers.

**Assessment**: The shape catalog session-3 findings (line 1903: "Shape 7b + Shape 1c + command-per-value fan-out: this is the most-composed card so far") established that Shape 1c IS a valid facet alongside Shape 7b for hook commands. The real inconsistency is that hook_crhook labels it in the header while its siblings do not.

**Apply-pass correction**: Align hook_crhook's section header with its siblings. Change `## hook_crhook (KTX command, Voting -- Shape 7b + Shape 1c, reference card)` to `## hook_crhook (KTX command, Voting -- Shape 7b + fan-out modifier [REFERENCE CARD])`. The CTF prerequisite is already handled in the Prerequisites slot of the reference card body; it does not need to be in the section header. No change needed to swapall (whose Shape 1c tag is not asymmetric with any sibling).

---

### Finding 4 -- k_vp_map default-value asymmetry: no FLAG raised unlike all k_vp_* peers (k_vp_map)

**Cards affected**: k_vp_map.

All other `k_vp_*` cvars in this batch carry a `FLAG:` note surfacing the stored-0-vs-claimed-51 discrepancy between the existing description and source (`RegisterCvar` with no default = stored 0, clamped to 51 at runtime). The k_vp_map card's Notes explicitly acknowledge the same fact ("Stored default is 0 (empty string, `RegisterCvar` with no explicit default)") but deliberately chose NOT to raise a `FLAG:` prefix, framing it as "informative without contradicting the existing description's framing."

The k_vp_map proposed draft Default line reads: `Default: 51 (stored as 0/empty; clamped to 51 at tally time).` This is semantically identical to the corrected Default lines on the flagged peers (k_vp_nospecs: `Default: 51 (stored as 0/empty; clamped to 51 at tally time).`), so the CONTENT of the draft is consistent with peers. The only asymmetry is the absence of the FLAG marker.

**What source says**: `RegisterCvar("k_vp_map")` at `world.c:828` -- no default argument. Stored value is 0. The effective-51 behavior is purely runtime via `bound(51, percent, 100)` at `vote.c:330`. Identical pattern to all other non-suggestcolor `k_vp_*` cvars.

**Apply-pass correction**: No content correction needed -- the draft Default line is factually accurate and consistent with peer content. Apply-pass-author is aware (per the sub-agent's own Notes) that the existing description's "Default: 51" maps to the effective-truth framing. For DB field hygiene: the apply-pass-author should store `51 (effective; stored as 0, clamped at tally time)` or the peer-matching form -- whichever the team settles on for the k_vp_* family. No re-dispatch needed.

---

### Finding 5 -- OV_BREAK floor catalog: sweep instructions say "no floor" but source has max(1) and max(2) floors

**Cards affected**: k_vp_break (Notes), next_map (Notes).

The sweep instructions (check 10) state: "OV_BREAK, OV_MAP: no floor." This is INCORRECT for OV_BREAK per source.

**What source says** (`vote.c:371-378`):

```c
else if ((fofs == OV_BREAK) && k_matchLess && (match_in_progress == 1))
    vt_req = max(2, vt_req); // at least 2 votes in matchless countdown
else if (fofs == OV_BREAK)
    vt_req = max(1, vt_req); // at least 1 vote in any other case
```

OV_BREAK has two floor arms:
- matchless + countdown (`match_in_progress == 1`): `max(2, vt_req)`
- all other OV_BREAK cases: `max(1, vt_req)`

OV_MAP has no explicit floor arm (no `max(N, vt_req)` case for OV_MAP in the floor section) -- confirmed correct.

The k_vp_break card already correctly identifies the max(1) floor in its Notes ("Minimum floor: `vt_req = max(1, vt_req)` at `vote.c:377` for the OV_BREAK path"). The next_map card also notes the max(2) floor for the matchless countdown path. Both cards are source-accurate. The discrepancy is in the sweep instructions' catalog, not in the cards.

**Assessment**: No apply-pass correction needed for any card. The instruction catalog is the error; the draft Notes are correct. Recorded here for completeness so the apply-pass-author understands this floor entry was verified.

---

### Assessment: Checks 1, 2, 6 -- shared misintuitions, cross-card contradictions, cross-batch See-also

**Check 1 (shared misintuitions)**: No systematic shared misintuition across multiple cards. Each per-card FLAG is localized to that card's specific discrepancy. The default-value pattern ("Default: 51" in existing descriptions, stored 0 in source) is a shared misintuition in the EXISTING descriptions, not in the v2 drafts -- all drafts correctly surface the stored-vs-effective distinction.

**Check 2 (cross-card factual contradictions)**: The vote-threshold formula `max(N, ceil(percent/100 * eligible_voters))` is applied consistently across all k_vp_* cards. The `bound(51, percent, 100)` clamping is correctly stated on all cards (no card claims a different clamping formula or a different lower bound). No cross-card contradiction on the threshold formula.

**Check 6 (cross-batch See-also)**:
- `k_vp_nospecs` (this batch, line 685) cross-links `nospecs` via See-also. The Spectator chat batch (2026-05-25, line 236) confirms `nospecs` carries `See also: k_vp_nospecs (vote threshold percentage)`. Bidirectional link is valid.
- `k_vp_teamoverlay` (this batch, line 962) cross-links `teamoverlay` (vote command) and `k_teamoverlay` (state cvar, Server-config batch). The Server-config batch (2026-05-23, lines 2234-2235) confirms `k_teamoverlay` carries `See also: teamoverlay, k_vp_teamoverlay`. Bidirectional link is valid.

---

### Assessment: Check 4 -- permission flag asymmetry

All command CF_* registration flags verified against `commands.c`. Key verifications:

- `antilag`: `CF_PLAYER | CF_SPC_ADMIN` -- card Permission "any player or admin spectator" -- correct.
- `cm`: `CF_BOTH | CF_MATCHLESS | CF_NOALIAS` -- card Permission "any player or admin spectator" -- correct (CF_BOTH = CF_PLAYER | CF_SPECTATOR, but non-admin spectator refusal is handler-internal).
- `elect`: `CF_BOTH | CF_MATCHLESS` -- card Permission "any player; or any spectator pre-match" -- correct.
- `hook_smooth/fast/classic/crhook`: `CF_PLAYER | CF_MATCHLESS` -- card Permission "any player" -- correct.
- `next_map`: `CF_PLAYER | CF_MATCHLESS_ONLY` -- card Permission "any player (matchless mode only)" -- correct.
- `no`, `yes`: `CF_PLAYER | CF_MATCHLESS` -- card Permission "any player" -- correct.
- `pickup`: `CF_PLAYER` -- card Permission "any player" -- correct.
- `suggestcolor`: `CF_PLAYER | CF_PARAMS` -- card Permission "any in-game player" -- correct.
- `swapall`: `CF_PLAYER | CF_SPC_ADMIN` -- card Permission "any player or admin spectator" -- correct.
- `teamoverlay`: `CF_PLAYER | CF_SPC_ADMIN` -- card Permission "any player or admin spectator" -- correct.
- `votecoop`: `CF_PLAYER | CF_MATCHLESS` -- card Permission "any player" -- correct.
- `voteprivate`: `CF_PLAYER` -- card Permission "any player" -- correct.
- `whovote`: `CF_BOTH | CF_MATCHLESS` -- card Permission "any player or spectator" -- correct.

No CF_* mismatch found across any card in this batch.

---

### Assessment: Check 5 -- hook family canonical-card discipline

The canonical-card pattern is correctly applied: hook_classic (card 21) is the canonical card carrying the full family description. hook_fast, hook_smooth, and hook_crhook are reference cards pointing at hook_classic via See-also. All three reference cards carry their per-sibling delta (which k_ctf_hookstyle value is set on pass, and whether k_vp_hookstyle applies). The whovote gap (hook_crhook votes not shown) is correctly surfaced in both the whovote card Notes and the hook_crhook card Notes. See Finding 3 above for the section-header Shape 1c inconsistency on hook_crhook.

---

### Assessment: Check 7 -- Shape 7a/7b classification

All 34 cards verified:

- Shape 7a (election with yes/no time-box): k_vp_admin, k_vp_captain, k_vp_coach, k_vp_suggestcolor (threshold cvars); elect, suggestcolor (election starter commands). All have time-boxed `electguard` with 60-second timeout; all route approval through `yes`/`no`. Correctly classified.
- Shape 7b (continuous toggle, no time-box): all remaining vote-command and threshold-cvar cards (antilag, cm, hook_*, next_map, pickup, swapall, teamoverlay, votecoop, voteprivate, and their k_vp_* counterparts). None of these use `electguard` or universal `yes`/`no`. Correctly classified.
- shape-less: no, yes, whovote. Correct -- these are service commands without a primary inter-entity shape relationship.

No misclassification found.

---

### Assessment: Check 8 -- Shape 11b composition candidates

No `fpd` bitmask references exist in `vote.c` (grep confirmed zero matches). No Shape 11b composition slipped through in any card of this batch. k_vp_teamoverlay card Notes explicitly confirm the negative check for OV_TEAMOVERLAY. Clean.

---

### Assessment: Check 11 -- admin-veto presence catalog per OV_*

Verified against `vote.c` `is_admins_vote()` calls:

- OV_ANTILAG (line 1387): admin veto present. k_vp_antilag and antilag cards: correctly surfaced.
- OV_COOP (line 1127): admin veto present. k_vp_coop and votecoop cards: correctly surfaced.
- OV_NOSPECS (line 947): admin veto present. k_vp_nospecs card: correctly surfaced.
- OV_TEAMOVERLAY (line 1050): admin veto present. k_vp_teamoverlay and teamoverlay cards: correctly surfaced.
- OV_PICKUP (line 738): admin veto present. k_vp_pickup and pickup cards: correctly surfaced.
- OV_RPICKUP (line 792) + OV_SWAPALL (line 1635): admin veto present. k_vp_rpickup card: correctly surfaced. swapall card: surfaced but with factual error on swap-not-executed (see Finding 1).
- OV_PRIVATE (line 1467): admin veto present. k_vp_privategame and voteprivate cards: correctly surfaced.
- OV_HOOKSMOOTH (line 1227), OV_HOOKFAST (line 1271), OV_HOOKCLASSIC (line 1314), OV_HOOKCRHOOK (line 1358): admin veto present on all 4. k_vp_hookstyle and hook_classic cards: admin veto surfaced for smooth/fast/classic; hook_crhook reference card also correctly notes admin veto; k_vp_hookstyle Effect says "three channels" (Finding 2).
- OV_ELECT: NO admin veto in `vote_check_elect()`. k_vp_admin, k_vp_captain, k_vp_coach, k_vp_suggestcolor, elect, suggestcolor cards: correctly note absence.
- OV_MAP: NO admin veto (admin gets tie-break priority via `vote_get_maps()` instead). cm and k_vp_map cards: correctly note tie-break-not-veto distinction.
- OV_BREAK: NO admin veto (separate `forcebreak` command is the admin path). k_vp_break card: correctly notes absence. next_map card: correctly notes absence.

---

### Assessment: Check 12 -- hook_crhook blind-spot in whovote

The whovote card (card 33) explicitly surfaces the hook_crhook blind-spot at line 1880: "hook_crhook votes are NOT shown even when active (source omission -- see Notes)". The hook_crhook reference card Notes (line 1276) record this for the apply-pass-author: "whovote gap (secondary finding): commands.c:2290-2348 whovote display iterates OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC tallies but not OV_HOOKCRHOOK." Both cards handle this consistently and correctly.

---

### Finding 5 -- `cm` framing leaks implementation-level mechanism users can't act on

**Cards affected**: cm, k_no_vote_map, k_vp_map, next_map.

**Source / context** (surfaced 2026-05-26 post-sweep by operator empirical test of `/cm`):

The `cm` card's Headliner says "Casts (or redirects) your map vote by list index" -- technically accurate per `commands.c:698`, but `cm` is registered `CF_NOALIAS | CD_NODESC` (internal alias-target, no user description). The user-facing parallel is `votemap` (`commands.c:701`, `CF_PARAMS | CD_VOTEMAP`). `mapslist[]` is per-server-arbitrary and NOT user-exposed -- a user has no way to know "index 3 = e1m2 on this server" before casting the vote. The auto-aliases hide the index entirely.

**What source says**:

- `commands.c:698` -- `cm` is `CF_BOTH | CF_MATCHLESS | CF_NOALIAS`, CD_NODESC.
- `commands.c:701` -- `votemap` is the user-facing peer, `CF_PARAMS`, CD_VOTEMAP.
- `maps.c:313` -- KTX stuffs `alias <mapname> cmd cm <index>` on connect (e.g. `alias dm3 cmd cm 3`). Player types `/dm3`; client expands to `cmd cm 3`; user never sees the index.
- `maps.c:296` -- parallel mechanism stuffs `alias <mapname> "cmd votemap <mapname>"`. Both routes feed OV_MAP.
- Operator verification 2026-05-26: `cmd cm 3` works (switches to mapslist[2] = e1m2 on default load); `/cm 3` does not work (CF_NOALIAS blocks direct console invocation).

**Cross-batch verification COMPLETE 2026-05-26** (pre-flight ship):

Mechanism map saved at `apps/qw-oracle/docs/reviews/ktx-map-voting-mechanism-map.md`. Per source-walk of `VoteMap` (`maps.c:503`), `VoteMapSpecific` (`maps.c:486`), `DoSelectMap` (`maps.c:392`), `PlayerBreak` (`match.c:2970`), `AdminForceBreak` (`admin.c:708`), `mapslist_dl` (`maps.c:244`), `ToggleMapLock` (`admin.c:849`), and registration rows in `commands.c`:

- **votemap = vote-cast (possibility (a))**: `VoteMap` is a thin wrapper that parses arg as mapname, calls `VoteMapSpecific` -> `GetMapNum` -> `DoSelectMap(map_num)`. Same shared body as `cm`. Same OV_MAP channel. Same Shape 7b vote-cast mechanism. **The existing votemap L1 description "switch to a named map IMMEDIATELY" is WRONG** -- a foundational source-vs-description framing error. When `votemap` is drafted in a future Match flow batch, the draft-time spot-check MUST flag this (Park-trigger-3-candidate if the existing framing dominates the description, or `drafted_with_flag` if localized).
- **Auto-alias mechanism is per-client capability**: `mapslist_dl` at `maps.c:244` branches on `isSupport_Params(self)`. Modern clients (CF_PARAMS-capable) get `alias <mapname> "cmd votemap <mapname>"` (line 296); legacy clients get `alias <mapname> cmd cm <index>` (line 313). NOT both-at-once on a given client. Both ultimately call `DoSelectMap` -- same OV_MAP channel, same threshold (`k_vp_map`), same gates (`k_no_vote_map`, `k_lockmap`).
- **break + next_map share PlayerBreak handler + OV_BREAK channel**: `next_map` is registered at `commands.c:995` with handler `PlayerBreak` (same as `break` at `commands.c:709`). The CF_MATCHLESS_ONLY flag is the only difference. Inside `PlayerBreak` the live-match path is a Shape 7b vote-toggle on `self->v.brk` calling `vote_check_break()` -> OV_BREAK; matchless mode just broadcasts a different message ("votes for next map" vs "votes for stopping the match"). **Threshold cvar is phase-dependent**:, OV_BREAK reads `cvar(k_matchLess ? "k_vp_map" : "k_vp_break")`. So `next_map` (always matchless) always reads `k_vp_map`; `break` reads `k_vp_map` in matchless mode but `k_vp_break` in non-matchless mode. The Voting-batch's `k_vp_map` draft cross-link to `next_map` is a REAL threshold relationship (not just name-related); the existing draft already correctly captures the multi-consumer pattern.
- **forcebreak = shape-less admin override** (`admin.c:708`, `AdminForceBreak`, CF_BOTH_ADMIN): immediate `EndMatch(0)` (live match) or `StopTimer(1)` (countdown). NOT a vote-cast, no OV_BREAK feed -- per the Voting-batch finding that OV_BREAK has no `is_admins_vote()` arm, forcebreak is the architecturally-separate override path.
- **k_lockmap = Shape 1 + Shape 4 composition**: paired toggle command is `lockmap` (`commands.c:756`, handler `ToggleMapLock` at `admin.c:849`, CF_BOTH_ADMIN). Cvar gates `DoSelectMap` against non-admins at `maps.c:434` with "MAP IS LOCKED!". Subsidiary use at `world.c:112` (`CheckDefMap`): suppresses empty-server auto-reload-to-default-map when lockmap is set.
- **mapslist_dl = shape-less connect-time download** (`maps.c:244`): paginated, self-recursive across frames, opt-out via userinfo `nomaps > 0`. The mechanism head is `StuffMaps(p)` at `maps.c:337`, which also stuffs `ktx_am4` / `ktx_am8` batch-alias-makers for CF_PARAMS clients.

See the mechanism map for the full picture including the See-also matrix that should be applied bidirectionally when the 5 pending entities are drafted in future batches.

**Apply-pass correction** (verified framings, ready to apply):

- **cm card**: reframe as internal alias-target, not user-facing. Headliner should clarify it's reachable only via `cmd cm <N>` and is normally invoked by the stuffed map-name aliases (legacy-client branch of `mapslist_dl`). Permission line note `CF_NOALIAS` ("internal command -- direct console invocation blocked; reachable only via stuffed `cmd cm <N>` from the auto-aliased map shortcuts for CF_PARAMS-incapable clients"). Effect should describe the alias-invocation flow (`/dm3` -> `cmd cm 3` -> votes for `mapslist[2]`). See-also leads with `votemap` (user-facing peer; Shape 7b vote-cast, same `DoSelectMap`, same OV_MAP) and references `mapslist_dl` (mechanism that stuffs the aliases).
- **k_no_vote_map card**: rewrite Headliner from "Blocks map voting (cm) and /next_map" to "Blocks the map-vote commands (`votemap` + the auto-aliased map shortcuts) and `next_map` in matchless mode." Pivot user-facing reference away from `cm`. Also note (Effect bullet) that the same matchless gate suppresses `break` per `match.c:3021` ("Voting next map is not allowed") -- multi-consumer gate spanning OV_MAP + OV_BREAK in matchless mode.
- **k_vp_map card**: See-also currently lists `cm` as primary paired peer; pivot to `votemap` as primary (user-facing pair, OV_MAP channel), with `cm` noted as the internal alias-target it routes through. Keep `next_map` cross-link as a REAL multi-channel threshold relationship (the OV_BREAK switch arm reads `k_vp_map` when matchless). The existing draft's Effect already correctly says "Governs both the `cm` (current-map / map selection) vote and the `next_map` vote in matchless mode" -- this stays; only the See-also benefits from the votemap pivot.
- **next_map card**: re-frame any cross-references to `cm` to pivot toward `votemap` (user-facing). The existing draft's See-also line incorrectly says "cm (sibling vote on same OV_BREAK channel in matchless mode)" -- cm is OV_MAP, NOT OV_BREAK; this is a pre-existing factual error to correct alongside the cm-pivot. Clarify the OV_BREAK channel share with `break` (and that the matchless conditional makes next_map's threshold `k_vp_map`, not `k_vp_break`).

**Tracking**: pre-flight investigation COMPLETE 2026-05-26 (this finding, refined). Parking doc `docs/superpowers/parking/2026-05-26-handoff-cross-batch-map-mechanism-preflight.md` deleted on same commit. Mechanism map at `apps/qw-oracle/docs/reviews/ktx-map-voting-mechanism-map.md` is the cross-batch reference for future ktx-l1-rewrite batches drafting the 5 PENDING entities (`votemap`, `mapslist_dl`, `k_lockmap`, `lockmap`, `break`, `forcebreak`).
