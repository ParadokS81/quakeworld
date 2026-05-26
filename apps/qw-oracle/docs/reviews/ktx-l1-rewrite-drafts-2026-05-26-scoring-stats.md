# ktx-l1-rewrite drafts -- batch 2026-05-26 (Scoring & stats)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher` (chunked-mode calibration run -- 4 chunks of 6+5+4+4
entities). Apply-pass-author reviews each card, applies clean drafts,
hand-edits flagged-drafts after verifying the surfaced contradiction. Drafts
do NOT auto-apply to L1 (`entities.description`); the apply pass is a
separate phase.

19 cards drafted, 0 parked. 14 drafted clean + 5 drafted_with_flag.

---

## k_on_end_f_modified (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted_with_flag
- **Source**: src/world.c:807 (registration); src/match.c:406-409 (read site)
- **Catalog line**: 14888
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When enabled and a matchtag is assigned, KTX broadcasts the `f_modified` trigger text into chat once at match-end. Clients with the standard `f_modified` trigger auto-reply with their modified-files report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
>
> 0 = trigger disabled.
> 1 = trigger fires once at match-end.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). No `cvar_toggle_msg` site; no cycle handler; no command reads this cvar as a gate. Read only in `EndMatch()` in match.c. Canonical card for the k_on_end_f_* family of 3 near-identical siblings, which differ only in which f_ trigger word is used. Canonical-card pattern applies.

### Proposed draft

```
Controls whether the `f_modified` check runs at match end. When enabled and a matchtag is set, KTX forces one player to say `f_modified` as the match ends, prompting any client with the standard `f_modified` alias to reply in chat with their modified-files report. The replies build a per-client chain in the match demo record. Fires only when the match had a matchtag and a live match actually ended (not during warm-up breaks). Canonical card for the k_on_end_f_* family; k_on_end_f_ruleset and k_on_end_f_version work identically for their respective trigger words.

0 = f_modified check disabled at match end.
1 = f_modified check fires once at match end.

Default:       1.
Permission:    server config only.

Example:
  # server.cfg -- disable all end-of-match f_ checks
  k_on_end_f_modified 0
  k_on_end_f_ruleset  0
  k_on_end_f_version  0

  # or leave all at default (1) to collect full client info in demos

See also: k_on_end_f_ruleset (sibling -- same behavior for f_ruleset), k_on_end_f_version (sibling -- same behavior for f_version), k_on_start_f_modified (counterpart -- fires at match start instead)
```

### Notes

- FLAG: Existing description says "KTX broadcasts the `f_modified` trigger text into chat" -- source shows KTX stuffcmds the first player found in entity-iteration order to `say f_modified`. It does not broadcast directly; the f_ chain depends on other clients having the standard alias set. The phrasing "KTX broadcasts" implies a server-level broadcast to all clients, which is inaccurate. Proposed draft corrects this.
- FLAG: Existing description says "fires exactly once per match-end regardless of player count" -- the `f_modified_done` flag in `EndMatch()` prevents multi-fire (correct), but if NO players are connected at match end the trigger never fires. Apply-pass-author should confirm whether this edge case warrants a note.
- The `old_match_in_progress == 2` guard means this only fires for real in-progress match ends, not warm-up cancellations.
- Matchtag is a serverinfo key (set via `serverinfo matchtag "..."` in server.cfg or as a usermode argument), not a KTX k_* cvar.

---

## k_on_end_f_ruleset (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:808 (registration); src/match.c:411-414 (read site)
- **Catalog line**: 14919
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When enabled and a matchtag is assigned, KTX broadcasts the `f_ruleset` trigger text into chat once at match-end. Clients with the standard `f_ruleset` trigger auto-reply with their active-ruleset report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
>
> 0 = trigger disabled.
> 1 = trigger fires once at match-end.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Reference card for the k_on_end_f_* family; k_on_end_f_modified is the canonical card. Mechanism is identical to the canonical; trigger word differs (`f_ruleset` instead of `f_modified`).

### Proposed draft

```
Controls whether the `f_ruleset` check runs at match end. Same behavior as k_on_end_f_modified, but uses the `f_ruleset` trigger word -- clients with the standard `f_ruleset` alias reply with their active-ruleset report.

0 = f_ruleset check disabled at match end.
1 = f_ruleset check fires once at match end.

Default:       1.
Permission:    server config only.

See also: k_on_end_f_modified (canonical card for full end-group behavior), k_on_end_f_version (sibling -- f_version trigger), k_on_start_f_ruleset (counterpart -- fires at match start)
```

### Notes

- Reference card per canonical-card pattern; full mechanism description lives on k_on_end_f_modified.
- No behavioral differences from the canonical card other than the trigger word (`f_ruleset`).

---

## k_on_end_f_version (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:809 (registration); src/match.c:416-419 (read site)
- **Catalog line**: 14950
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When enabled and a matchtag is assigned, KTX broadcasts the `f_version` trigger text into chat once at match-end. Clients with the standard `f_version` trigger auto-reply with their client-version report, building a per-client info chain in the match record. The trigger fires exactly once per match-end regardless of player count. Has no effect on matches without a matchtag.
>
> 0 = trigger disabled.
> 1 = trigger fires once at match-end.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Reference card for the k_on_end_f_* family; k_on_end_f_modified is the canonical card. Mechanism is identical to the canonical; trigger word differs (`f_version` instead of `f_modified`).

### Proposed draft

```
Controls whether the `f_version` check runs at match end. Same behavior as k_on_end_f_modified, but uses the `f_version` trigger word -- clients with the standard `f_version` alias reply with their client-version report.

0 = f_version check disabled at match end.
1 = f_version check fires once at match end.

Default:       1.
Permission:    server config only.

See also: k_on_end_f_modified (canonical card for full end-group behavior), k_on_end_f_ruleset (sibling -- f_ruleset trigger), k_on_start_f_version (counterpart -- fires at match start)
```

### Notes

- Reference card per canonical-card pattern; full mechanism description lives on k_on_end_f_modified.
- No behavioral differences from the canonical card other than the trigger word (`f_version`).

---

## k_on_start_f_modified (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted_with_flag
- **Source**: src/world.c:804 (registration); src/match.c:2939-2942 (read site)
- **Catalog line**: 14981
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When enabled and the match has a matchtag, automatically broadcasts the starting player's f_modified (modified-files) report to chat at match start. Has no effect on matches without a matchtag.
>
> 0 = no automatic f_modified at match start.
> 1 = f_modified sent at match start.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Read only in `PlayerReady()` in match.c at the point where the last player's ready-state triggers the match countdown. Canonical card for the k_on_start_f_* family of 3 near-identical siblings, which differ only in which f_ trigger word is used. Canonical-card pattern applies.

### Proposed draft

```
Controls whether the `f_modified` check runs at match start. When enabled and a matchtag is set, KTX forces the match-starting player to say `f_modified` as the countdown begins, prompting any client with the standard `f_modified` alias to reply in chat with their modified-files report. Only the player whose ready-state triggered the match start says the trigger word; other clients respond via their own alias. Has no effect when no matchtag is set, or in hoonymode matches. Canonical card for the k_on_start_f_* family; k_on_start_f_ruleset and k_on_start_f_version work identically for their respective trigger words.

0 = f_modified check disabled at match start.
1 = f_modified check fires at match start.

Default:       1.
Permission:    server config only.

Example:
  # server.cfg -- disable all start-of-match f_ checks
  k_on_start_f_modified 0
  k_on_start_f_ruleset  0
  k_on_start_f_version  0

  # or leave all at default (1) to collect client info at match start

See also: k_on_start_f_ruleset (sibling -- same behavior for f_ruleset), k_on_start_f_version (sibling -- same behavior for f_version), k_on_end_f_modified (counterpart -- fires at match end instead)
```

### Notes

- FLAG: Existing description says "automatically broadcasts the starting player's f_modified report to chat" -- source shows KTX stuffcmds `self` (the last player whose ready-state triggered the match) to `say f_modified`. KTX does not broadcast the report directly; it forces one player to say the trigger word, and that player's client-side alias fires and is seen by all. Proposed draft corrects the framing.
- FLAG: Existing description does not mention the hoonymode exception. Source: when `isHoonyModeAny()` is true, `PlayerReady()` branches to `HM_all_ready()` and the k_on_start_f_* cvars are not checked. Proposed draft adds this exclusion.
- Unlike the k_on_end_f_* group, there is no `_done` flag here -- all three k_on_start_f_* cvars fire consecutively for the same player (`self`) in `PlayerReady()`.
- Matchtag is a serverinfo key (`serverinfo matchtag "..."` in server.cfg or usermode argument), not a KTX k_* cvar.

---

## k_on_start_f_ruleset (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:805 (registration); src/match.c:2944-2947 (read site)
- **Catalog line**: 15012
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Automatically broadcasts the f_ruleset report at match start (via the player who triggers the start). Only fires when the match has a matchtag assigned.
>
> 0 = no automatic f_ruleset at match start.
> 1 = f_ruleset is broadcast automatically when the match begins.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Reference card for the k_on_start_f_* family; k_on_start_f_modified is the canonical card. Mechanism is identical to the canonical; trigger word differs (`f_ruleset` instead of `f_modified`).

### Proposed draft

```
Controls whether the `f_ruleset` check runs at match start. Same behavior as k_on_start_f_modified, but uses the `f_ruleset` trigger word -- clients with the standard `f_ruleset` alias reply with their active-ruleset report.

0 = f_ruleset check disabled at match start.
1 = f_ruleset check fires at match start.

Default:       1.
Permission:    server config only.

See also: k_on_start_f_modified (canonical card for full start-group behavior), k_on_start_f_version (sibling -- f_version trigger), k_on_end_f_ruleset (counterpart -- fires at match end)
```

### Notes

- Reference card per canonical-card pattern; full mechanism description lives on k_on_start_f_modified.
- No behavioral differences from the canonical card other than the trigger word (`f_ruleset`).

---

## k_on_start_f_version (KTX cvar, Scoring & stats -- Shape 3 + canonical-card pattern)

- **Status**: drafted
- **Source**: src/world.c:806 (registration); src/match.c:2949-2952 (read site)
- **Catalog line**: 15043
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When enabled and the match has a matchtag, automatically broadcasts the starting player's f_version (client version) report to chat at match start. Has no effect on matches without a matchtag.
>
> 0 = no automatic f_version at match start.
> 1 = f_version sent at match start.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Reference card for the k_on_start_f_* family; k_on_start_f_modified is the canonical card. Mechanism is identical to the canonical; trigger word differs (`f_version` instead of `f_modified`).

### Proposed draft

```
Controls whether the `f_version` check runs at match start. Same behavior as k_on_start_f_modified, but uses the `f_version` trigger word -- clients with the standard `f_version` alias reply with their client-version report.

0 = f_version check disabled at match start.
1 = f_version check fires at match start.

Default:       1.
Permission:    server config only.

See also: k_on_start_f_modified (canonical card for full start-group behavior), k_on_start_f_ruleset (sibling -- f_ruleset trigger), k_on_end_f_version (counterpart -- fires at match end)
```

### Notes

- Reference card per canonical-card pattern; full mechanism description lives on k_on_start_f_modified.
- No behavioral differences from the canonical card other than the trigger word (`f_version`).

---

## k_dmgfrags (KTX cvar, Scoring & stats -- Shape 1 cvar+toggle)

- **Status**: drafted_with_flag
- **Source**: src/world.c:980
- **Catalog line**: 14857
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables damage-frags scoring. When on, frags are earned by cumulative damage dealt to enemies (1 frag per 100 damage) instead of by kills; a normal kill no longer awards a +1 frag. Teammate and self-damage do not count; tele-death is excluded; Pentagram interaction is handled specially. The active mode name gains a "-df" suffix.
>
> 0 = normal kill-based scoring.
> 1 = damage-based scoring.
>
> Default: 0.
> Set by: server config or 'dmgfrags' toggle command.

### Shape classification

Shape 1 (cvar + paired toggle). `cvar_toggle_msg(self, "k_dmgfrags", redtext("damage frags"))` is present in the `dmgfrags` handler (commands.c:8124). The toggle handler has `is_rules_change_allowed()` and an LGC-mode check but no base-mode precondition (not Shape 1c). Clean Shape 1 fit.

### Proposed draft

```
Switches scoring from kill-based to damage-based: instead of a +1 frag per kill, players earn 1 frag for every 100 damage points dealt to enemies.

0 = kill-based scoring (normal).
1 = damage-based scoring.

Effect:
  When on, ordinary kills no longer award +1 frags; damage accumulates and converts at 1 frag per 100 damage dealt.
  Telefrag damage is excluded and does not count toward the total.
  Targets protected by the Pentagram of Protection are excluded while their invincibility is active.
  The active mode name gains a "-df" suffix while this is on.
  Enabling LGC mode forcibly turns off damage-frags (both cannot be active at the same time).

Permission:    server config or 'dmgfrags' admin command in-game
Match-state:   pre-match only
Default:       0

Example:
  # server.cfg
  k_dmgfrags 1

  # or in-game (admin, pre-match)
  dmgfrags

See also: dmgfrags (paired toggle command)
```

### Notes

- FLAG: Existing description omits a key surprise behavior: when LGC mode is enabled, KTX forcibly resets `k_dmgfrags` to 0 (commands.c:7869-7871). Users cannot run both LGC and damage-frags simultaneously; LGC activation silently wins. This is added as an Effect bullet in the v2 recast.
- The existing description is otherwise accurate (1/100 conversion, telefrag exclusion, Pentagram exclusion, "-df" suffix, default 0).
- Two mode presets bundle `k_dmgfrags 1` (commands.c:4478, 4502), meaning dmgfrags can also be activated implicitly via a mode-preset command. Not surfaced in v2 Effect (mode-preset behavior belongs on those preset cards); noted here for the apply-pass author.

---

## dmgfrags (KTX command, Scoring & stats -- Shape 1 cvar+toggle command side)

- **Status**: drafted
- **Source**: src/commands.c:985
- **Catalog line**: 15074
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that toggles damage-based scoring (k_dmgfrags). When on, score is awarded at roughly 1 frag per 100 damage dealt; telefrag damage is excluded and ordinary kill-frags are not counted. Blocked when rules changes are not permitted, or when LGC mode is active.
>
> Default: off (k_dmgfrags = 0).
> Set by: admin command 'dmgfrags' or server config (k_dmgfrags).

### Shape classification

Shape 1 command side. Handler at commands.c:8108 calls `cvar_toggle_msg(self, "k_dmgfrags", ...)` after `is_rules_change_allowed()` and LGC check. Paired cvar is `k_dmgfrags`. CF_PLAYER | CF_SPC_ADMIN = admin only (player-side admin or spectator-side admin).

### Proposed draft

```
Admin command that toggles damage-based scoring (k_dmgfrags).

Prerequisites: LGC mode must not be active ("Dmgfrags is not allowed in LGC mode").

Permission:    admin only
Match-state:   pre-match only

Example:
  dmgfrags

See also: k_dmgfrags (paired state cvar)
```

### Notes

- Existing description has value-enum bleed ("score is awarded at roughly 1 frag per 100 damage; telefrag excluded") -- per Shape 1 discipline, value enum lives on the cvar card, not the command card. Removed in v2 recast.
- "Default: off (k_dmgfrags = 0)" line removed -- commands have no default; the cvar default belongs on the cvar card.
- "Set by: ... or server config (k_dmgfrags)" removed -- the server-config path belongs on the cvar card.
- LGC prerequisite (refusal message verbatim) is correctly surfaced in Prerequisites per the v2 discipline.
- CF_PLAYER | CF_SPC_ADMIN maps to "admin only" (the admin-required bit is set regardless of player vs spectator slot).

---

## scores (KTX command, Scoring & stats -- shape-less state-printer)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:703
- **Catalog line**: 15268
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the current match status to your console. Output varies by match state:
>
> Outside a live match: "Intermission", "no game - no scores", or "Countdown".
> During play: sudden-death/overtime status (if active), frags remaining until fraglimit, time remaining (mm:ss), and per-team or per-player scores. Clan Arena shows the CA-specific scoreboard.
>
> Affects only your console. No arguments.
>
> Set by: 'scores' command (any player).

### Shape classification

Shape-less. `scores` is a standalone state-printer: reads current match state and prints to the caller. No cvar pairing (no `cvar_toggle_msg`, no `cvar_fset`), no sibling family, no election role, no gate role. CF_BOTH | CF_MATCHLESS registration: any player or spectator, any match state. Pure read-and-print.

### Proposed draft

```
Prints current match time and scores to your console.

Effect:
  Outside a live match: prints "Intermission", "Countdown", or "no game - no scores" depending on current state.
  During play: shows overtime/sudden-death status if active, frags remaining until fraglimit, time remaining, and team scores (or per-player scores in duel). Clan Arena shows the CA-specific scoreboard.

Permission:    any player or spectator

Example:
  scores

See also: stats (mid-match player statistics), effi (mid-match efficiency table), rules (mode-and-settings report), fpslist (frame-rate and player list)
```

### Notes

- FLAG: Existing description says "Set by: 'scores' command (any player)" -- CF_BOTH includes spectators, not players only. Permission should be "any player or spectator". Corrected in v2 recast.
- Match-state line omitted in the v2 recast because CF_MATCHLESS + handler behavior covers all states (the "any time" default applies; the per-state output variation is surfaced in Effect, not Match-state).
- See-also cross-links to `stats`, `effi`, `rules`, `fpslist` as state-printer family siblings (symmetric cross-batch relationship with prior Server config & network batch).

---

## stats (KTX command, Scoring & stats -- shape-less state-printer)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:704
- **Catalog line**: 15300
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints end-of-match player statistics. Only works after a match has ended; replies "no game - no statistics" otherwise.
>
> Output: players grouped by team, each showing name, frags, rank (frags minus deaths), friendly kills (team modes), and efficiency.
> In CTF: frag-based columns are net of capture points.
> In Race Arena: delegates to the Race Arena stats output.
>
> Set by: any player command (/stats).

### Shape classification

Shape-less. `stats` is a standalone state-printer: reads live match state and prints player statistics. No cvar pairing, no sibling family (the alias relationship with `effi` is a peer edge, not a Layer B relationship). CF_BOTH | CF_MATCHLESS registration. Both `stats` and `effi` point to the same `PlayerStats` handler with no per-command dispatch.

### Proposed draft

```
Prints a per-player statistics table during a live match.

Effect:
  Players are listed grouped by team, each showing: name, frags, rank (frags minus deaths), friendly kills (team modes only), and efficiency.
  In CTF, frag and rank columns net out capture points.
  In Rocket Arena, prints the RA-specific listing: Name / Frags / Wins / Loses / Effi.
  Outside a live match: prints "no game - no statistics".

Permission:    any player or spectator
Match-state:   mid-match only (returns refusal message outside a live match)

Example:
  stats

See also: effi (identical command -- alias for stats), scores (current time and team scores), fpslist (frame-rate and player list), rules (mode-and-settings report)
```

### Notes

- FLAG: Existing description says "Only works after a match has ended" -- this is INVERTED. Source shows `PlayerStats` fires only when `match_in_progress == 2` (a live running match). The comment at commands.c:3557 explicitly says "Nothing to do with the endgame stats." The post-match command is `laststats` (via `LastStats` which checks `!match_in_progress`). The v2 recast reflects source-truth: mid-match only.
- FLAG: "In Race Arena: delegates to the Race Arena stats output" -- source shows `isRA()` delegates to `ra_PlayerStats()`. This is correct but the RA output format (Name / Frags / Wins / Loses / Effi) is not described in the existing description. The v2 recast adds the column list, verified at arena.c:738-739.
- CF_BOTH maps to "any player or spectator" (not "any player" as implied by the existing Set-by line).
- `stats` and `effi` share the `PlayerStats` handler byte-for-byte; they are functionally identical aliases. Cross-linked in See-also.

---

## effi (KTX command, Scoring & stats -- shape-less state-printer)

- **Status**: drafted
- **Source**: src/commands.c:705
- **Catalog line**: 15102
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a per-player statistics table grouped by team: name, frags, rank (frags minus deaths, minus CTF captures), friendly kills (team modes only), and efficiency. Only available while a match is in progress -- prints "no game - no statistics" otherwise. In Rocket Arena, prints the RA-specific listing (Name / Frags / Wins / Loses / Effi) instead of the standard table.
>
> Set by: any player or spectator via 'effi' command.

### Shape classification

Shape-less. `effi` is a standalone state-printer: reads live match state and prints player statistics. Shares the `PlayerStats` handler with `stats` (no per-command dispatch). No cvar pairing, no sibling family. CF_BOTH | CF_MATCHLESS registration.

### Proposed draft

```
Prints a per-player statistics table during a live match.

Effect:
  Players are listed grouped by team, each showing: name, frags, rank (frags minus deaths), friendly kills (team modes only), and efficiency.
  In CTF, frag and rank columns net out capture points.
  In Rocket Arena, prints the RA-specific listing: Name / Frags / Wins / Loses / Effi.
  Outside a live match: prints "no game - no statistics".

Permission:    any player or spectator
Match-state:   mid-match only (returns refusal message outside a live match)

Example:
  effi

See also: stats (identical command -- alias for effi), scores (current time and team scores), fpslist (frame-rate and player list), rules (mode-and-settings report)
```

### Notes

- Existing description correctly identifies mid-match requirement. Content is accurate.
- RA listing (Name / Frags / Wins / Loses / Effi) verified against arena.c:738-739.
- `effi` and `stats` point to the same `PlayerStats` handler; they are functionally identical aliases. Cross-linked in See-also.
- v2 recast adds "In CTF, frag and rank columns net out capture points" (verified at commands.c:3633, 3638-3640 in PlayerStats) -- present in the existing `stats` description but absent from `effi`. Added for completeness.
- CF_BOTH confirmed as "any player or spectator" -- existing Set-by line was already correct.

---

## lastscores (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:899
- **Catalog line**: 15129
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the results of recently completed games to the requesting player. Each entry shows the matchup (team names or duelers), game-mode label, and per-map score; consecutive entries with the same matchup and mode are grouped. Ends with a count of entries, or "Lastscores data empty" when there is no history.
>
> Passing any argument switches to an extended view that also lists each team's roster (in team, CTF, and CA modes).
>
> Set by: any player (in-game command 'lastscores').

### Shape classification

shape-less -- standalone state-printer. Reads a ring buffer of up to 30 stored game results and prints them to the caller. No cvar pair, no toggle, no vote, no gate-check. `lastscoresktx` is a registered alias pointing at the identical handler with the same flags and description string; canonical-card pattern applies (this card is canonical; `lastscoresktx` is the reference card).

### Proposed draft

```
Prints a history of recently completed games to your console -- up to the 30 most recent matches, shown as matchup, game mode, and per-map score.

Effect:
  Each entry shows the two sides (team names or player names in duel) plus the game-mode label (duel / team / FFA / CTF / RA / Clan Arena / Wipeout / HoonyMode / race) and the per-map score.
  Consecutive entries with the same matchup and mode are grouped under one header.
  Passing any argument (e.g. 'lastscores 1') switches to extended view: team, CTF, and CA matches also list each side's full roster (one line per side, shown once per unique squad and again when the roster changed between maps).
  Ends with a count of entries found, or "Lastscores data empty" if no games have been recorded yet.

Permission:    any player or spectator
Match-state:   any time (available mid-match and between matches)

Example:
  lastscores          (compact view -- matchup, mode, scores)
  lastscores 1        (extended view -- adds per-team rosters for team/CTF/CA games)

See also: lastscoresktx (alias -- identical behavior), scores (current live match scores), stats (post-match player statistics), laststats (post-match detailed stat tables)
```

### Notes

- Canonical card for the lastscores/lastscoresktx alias pair. `lastscoresktx` gets a short reference card pointing here.
- The ring buffer holds up to 30 entries (MAX_LASTSCORES = 30); oldest entries are overwritten when full.
- "Any argument" for extended view: source checks `trap_CmdArgc() > 1`; the argument value doesn't matter.
- CF_MATCHLESS means available in matchless (server idle/warmup) mode, not just post-game.

---

## lastscoresktx (KTX command, Scoring & stats -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:900
- **Catalog line**: 15158
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the results of recently completed games to the requesting player (behaviourally identical alias of 'lastscores'). Each entry shows the matchup (team names or duelers), game-mode label, and per-map score; consecutive entries with the same matchup and mode are grouped. Ends with a count of entries, or "Lastscores data empty" when there is no history.
>
> Passing any argument switches to an extended view that also lists each team's roster (in team, CTF, and CA modes).
>
> Set by: any player (in-game command 'lastscoresktx').

### Shape classification

shape-less -- alias reference card. Source-confirmed: commands.c:900 registers `lastscoresktx` with the identical handler (`lastscores`), identical CF flags (CF_BOTH | CF_MATCHLESS | CF_PARAMS), and the same CD_LASTSCORES description string as `lastscores` at line 899. Canonical-card pattern applies; this is the reference card.

### Proposed draft

```
Alias of 'lastscores' -- prints the same history of recently completed games. See lastscores for the full description.

Permission:    any player or spectator
Match-state:   any time

See also: lastscores (canonical -- identical behavior, full description)
```

### Notes

- Reference card per canonical-card pattern. lastscores is canonical; full content lives there.
- Source-confirmed identical: same handler function pointer, same CF_ flags, same CD_ string. No behavioral delta.

---

## laststats (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:898
- **Catalog line**: 15187
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Re-displays the end-of-game statistics tables for the most recently completed match to the requesting client. Includes kill, item, weapon, and damage tables; CTF games add a CTF stats table; team games add a team-play summary. In midair, instagib, or LGC modes only the mode-specific stat tables are shown. Refused while a match is running; reports "Laststats data empty" if no data is stored.
>
> Set by: any player or spectator ('laststats' command; post-match only).

### Shape classification

shape-less -- standalone state-printer. Calls `MatchEndStatsTables()` which reads the `lastStatsData` flag (set at match-end) and renders per-mode stat tables to the caller. No cvar pair, no toggle, no vote, no gate cvar relationship. Match-state refusal ("Game in progress") comes from an explicit check inside the handler, not from CF_ registration alone.

### Proposed draft

```
Re-displays the detailed end-of-game statistics tables for the most recently completed match to your console.

Effect:
  Standard mode: kill stats, item stats, weapon efficiency, weapon damage, weapon taken, weapon dropped, weapon kills, enemy weapon kills, damage stats, item time, weapon time tables. CTF games add a CTF stats table. Team and CTF games add a team-play summary. Duel games omit the top-stats section.
  Midair mode: midair stats and midair kill stats only.
  Instagib mode: instagib stats and instagib kill stats only.
  LGC mode: LGC-specific stats only.
  If no match has been recorded since server start, prints "Laststats data empty".

Permission:    any player or spectator
Match-state:   post-match only (prints "Game in progress" if a match is running)

Example:
  laststats       (re-displays all stat tables for the last completed match)

See also: stats (live match player statistics), scores (current match scores), lastscores (history of recent match results)
```

### Notes

- The "post-match only" constraint comes from the handler's explicit `match_in_progress` check (src/commands.c:3547), not from CF_MATCHLESS_ONLY flag. CF_BOTH | CF_MATCHLESS means any player or spectator can invoke, including during matchless (idle) mode -- the match_in_progress check is what refuses it mid-game.
- The existing description is accurate and well-framed. Recast is primarily structural (v2 template application + Effect bullet expansion for mode branching).
- `lastStatsData` is set to true at match-end (stats.c:1730); initialized false at server start, so a fresh server with no completed match will show "Laststats data empty".

---

## wp_reset (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:828
- **Catalog line**: 15331
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Clears the calling player's per-weapon stats (hits and attacks counters used by the weapon-stats display). Only works before a match starts; does nothing while a match is in progress.
>
> Set by: any player 'wp_reset'.

### Shape classification

shape-less -- standalone reset command. `Wp_Reset` at commands.c:4978 checks `match_in_progress` and returns silently (no message printed) if true, otherwise calls `memset(self->ps.wpn, 0, sizeof(self->ps.wpn))` to zero the per-weapon stats array. No cvar pair, no toggle relationship, no vote.

### Proposed draft

```
Clears your per-weapon accuracy counters, resetting the stats shown by the weapon-stats overlay (+wp_stats) to zero.

Effect:
  Zeroes all hit and shot-attempt counts for every weapon.
  The +wp_stats overlay will show all zeros until you fire again.
  Has no effect while a match is in progress (silently ignored -- no message is printed).

Permission:    any player
Match-state:   pre-match only (silently ignored mid-match)

Example:
  wp_reset        (run before a match to start with a clean accuracy baseline)

See also: +wp_stats (weapon-stats overlay that displays the counters this command clears), -wp_stats (hides the overlay)
```

### Notes

- The silent no-op behavior (no error message when called mid-match) is confirmed in source: `Wp_Reset` returns without printing anything if `match_in_progress` is non-zero (commands.c:4980-4983). The existing description says "does nothing" which is correct but doesn't surface the silent nature -- the v2 draft makes this explicit ("silently ignored -- no message is printed") as a user-surprise-bearing detail.
- CF_PLAYER only (no CF_SPECTATOR): spectators cannot invoke this command. Surfaced in Permission as "any player" (not "any player or spectator").
- The existing description is accurate. No factual contradictions found.

---

## +scores (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:891
- **Catalog line**: 15214
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Press-and-hold bind that displays a centered overlay of the current match time and team scores. While held the overlay refreshes periodically; releasing the key (-scores) hides it. CTF mode also shows flag status. Suppressed during the pre-game/countdown phase and in race mode. Spectators tracking no one see 'Tracking no one (+scores)' instead.
>
> Set by: client bind (use with -scores for press/release pair).

### Shape classification

shape-less. The +/- prefix is a QW engine-level bind convention -- the engine dispatches +scores and -scores to the same handler (Sc_Stats) with on=2 and on=1 respectively. There is no KTX-specific inter-entity relationship between the two halves (no shared k_* cvar toggled, no KTX-specific state machine linking them). The pairing is covered by See-also cross-link; the command card stands alone for Layer B purposes.

### Proposed draft

```
Holds the on-screen scores overlay open -- shows current match time and team scores as a centerprint while the key is held.

Effect:
  Displays time remaining and the score differential (your score vs. opponent).
  In CTF, also shows flag carrier status for both flags.
  Refreshes continuously while held.
  When spectating with no player tracked, shows "Tracking no one (+scores)" instead of scores.
  Suppressed during the countdown phase and in race mode -- overlay does not appear.

Permission:    any player or spectator
Match-state:   any time

Example:
  bind mouse3 +scores    // hold to show scores, release to hide

See also: -scores (release half -- hides overlay), scores (one-shot console print of current score), +wp_stats (weapon-stats overlay, same press/hold pattern)
```

### Notes

- shape-less rationale: the +/- pairing is engine-level (cl_input.c dispatch convention), not a KTX Layer B relationship. Both commands route to the same C handler Sc_Stats via the command table's `on` parameter (2 = press, 1 = release). No KTX-specific cvar or state links the two halves. See-also cross-link handles the pairing.
- Source-verified: all claims in the existing description confirmed against Print_Scores() in client.c and the Sc_Stats handler. No contradictions.
- Behavioral addition: overlay refresh is timer-driven (sc_stats_time at SC_STATS_UPDATE intervals in PlayerPreThink), not instant-on-press. Also: the server calls refresh_plus_scores() when team scores change, so the overlay reflects live data.
- CF_BOTH | CF_MATCHLESS confirms: available to players and spectators, including in matchless/pre-game waiting mode.

---

## -scores (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:892
- **Catalog line**: 15241
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Release half of the +scores/-scores press-and-release bind pair. Hides the on-screen scoreboard overlay. Intended to be bound alongside +scores: hold to show the scoreboard, release to hide it. Takes no arguments.
>
> Set by: any player or spectator (typically bound with +scores).

### Shape classification

shape-less. Release half of an engine +/- bind pair. No KTX Layer B inter-entity relationship to tag. Minimal reference card pointing at +scores.

### Proposed draft

```
Release half of the +scores bind pair -- hides the scores overlay when the key is released.

Effect: Clears the scores overlay that +scores opened. Bind both together so the overlay shows only while the key is held.

Permission:    any player or spectator
Match-state:   any time

Example:
  bind mouse3 +scores    // +scores shows on press, -scores hides on release (engine handles automatically)

See also: +scores (press half -- full behavior description), scores (one-shot console print)
```

### Notes

- Canonical-card pattern applied: +scores is the canonical card for this press/hold pair. This card is minimal by design -- the engine automatically fires -scores on key release when +scores is bound; users bind +scores and get -scores for free.
- Source-verified: Sc_Stats(1) sets sc_stats=0; PostThink cleanup clears sc_stats_time when it expires; centerprint cleared when no other overlay (wp_stats, shownick) is pending.
- shape-less rationale: same as +scores. Engine +/- convention only.

---

## +wp_stats (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:829
- **Catalog line**: 15358
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the on-screen weapon-stats overlay -- a centerprint showing per-weapon hit/accuracy figures (axe hits; SG/SSG/NG/SNG/LG accuracy percentages; GL/RL direct-hit counts). When spectating, shows the tracked player's stats; displays "Tracking no one (+wp_stats)" if no target is tracked. Paired with '-wp_stats' to turn the overlay off.
>
> Set by: any player ('+wp_stats' / '-wp_stats').

### Shape classification

shape-less. Same engine +/- convention as +scores. Both +wp_stats and -wp_stats route to Wp_Stats handler with on=2 and on=1 respectively. No KTX-specific cvar links the two halves. See-also cross-link handles the pairing.

### Proposed draft

```
Holds the weapon-stats overlay open -- shows a per-weapon hit/accuracy summary as a centerprint while the key is held.

Effect:
  Displays accuracy or hit counts per weapon: axe (direct hits), SG/SSG/NG/SNG/LG (accuracy %), GL/RL (direct-hit count).
  Refreshes continuously while held.
  When spectating, shows the tracked player's weapon stats; shows "Tracking no one (+wp_stats)" if no player is tracked.
  Suppressed during the countdown phase and in race mode.

Permission:    any player or spectator
Match-state:   any time

Example:
  bind mouse4 +wp_stats    // hold to show weapon stats, release to hide

  (Optional: setinfo wps <bitmask>  to show only specific weapons in the overlay)
  (Optional: setinfo lw <N>         to shift the overlay N lines vertically)

See also: -wp_stats (release half -- hides overlay), wp_reset (clears your per-weapon hit counters), +scores (scores overlay, same press/hold pattern)
```

### Notes

- shape-less rationale: identical to +scores. Engine +/- convention; no KTX Layer B relationship.
- Source-verified: all claims in existing description confirmed against Print_Wp_Stats() in client.c. The wps bitmask filtering and lw/lw_x positional offset are user-configurable knobs surfaced in Example as Optional annotations per v2 discipline.
- LG-last-frag accuracy is also optionally shown when wps bitmask includes S_LGLastFrag; omitted from prose (Optional knob territory).
- Suppression conditions (match_in_progress != 1 and !isRACE()) apply to the periodic refresh, not the flag-set. Overlay is set active on press but Print_Wp_Stats() won't fire until match_in_progress != 1.
- CF_BOTH | CF_MATCHLESS: available to players and spectators in any match state including pre-game.

---

## -wp_stats (KTX command, Scoring & stats -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:830
- **Catalog line**: 15385
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Turns off the on-screen weapon-stats overlay for the caller (the per-weapon hit/accuracy centerprint that +wp_stats enables). The off half of the +wp_stats / -wp_stats pair.
>
> Default: n/a (command).
> Set by: any player in-game ('-wp_stats').

### Shape classification

shape-less. Release half of an engine +/- bind pair. No KTX Layer B inter-entity relationship to tag. Minimal reference card pointing at +wp_stats.

### Proposed draft

```
Release half of the +wp_stats bind pair -- hides the weapon-stats overlay when the key is released.

Effect: Clears the weapon-stats overlay that +wp_stats opened. Bind both together so the overlay shows only while the key is held.

Permission:    any player or spectator
Match-state:   any time

Example:
  bind mouse4 +wp_stats    // +wp_stats shows on press, -wp_stats hides on release (engine handles automatically)

See also: +wp_stats (press half -- full behavior description), wp_reset (clears stat counters)
```

### Notes

- Canonical-card pattern applied: +wp_stats is the canonical card for this press/hold pair.
- The existing description has "Default: n/a (command)." -- this is v1 template residue (commands don't carry a Default line in v2). Not a factual contradiction; v2 simply drops that line. No flag needed.
- Source-verified: Wp_Stats(1) sets wp_stats=0; PostThink cleanup clears wp_stats_time when expired; centerprint cleared when no other overlay pending.
- shape-less rationale: same as +wp_stats.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: `stats` post-match vs mid-match timing inversion (FOUNDATIONAL FRAMING ERROR caught at flag level)

**Verdict**: ACTIONABLE

**Cards involved**: `stats` (drafted_with_flag)

**Observation**: The existing L1 description for `stats` says "Only works after a match has ended; replies 'no game - no statistics' otherwise" -- this is a 180-degree inversion of source behavior. Source (commands.c:3557 `PlayerStats` handler) shows the command fires only when `match_in_progress == 2` (a live running match), and the handler comment explicitly says "Nothing to do with the endgame stats." The post-match command is `laststats` (separate handler `LastStats` which checks `!match_in_progress`). This was a foundational framing error in the prior synthesis -- the wrong description has been live for an unknown period.

**Source evidence**: src/commands.c:3557 (`PlayerStats` handler entry + explicit comment); src/commands.c:3547 (`LastStats` for comparison)

**Recommendation**: Apply-pass-author MUST verify the v2 timing wording ("mid-match only") before applying. This is the most impactful flag in this batch -- a foundational timing claim was inverted in the prior L1 description.

---

### F2: `scores` permission scope mismatch

**Verdict**: ACTIONABLE

**Cards involved**: `scores` (drafted_with_flag)

**Observation**: Existing description says "Set by: 'scores' command (any player)" -- but the registration at commands.c:703 uses CF_BOTH which includes spectators. The v2 recast corrects to "any player or spectator".

**Source evidence**: src/commands.c:703 (CF_BOTH | CF_MATCHLESS)

**Recommendation**: Apply the Permission line update.

---

### F3: `k_on_*_f_*` canonical-card framing -- "KTX broadcasts" is inaccurate

**Verdict**: ACTIONABLE

**Cards involved**: `k_on_end_f_modified` (canonical, drafted_with_flag), `k_on_start_f_modified` (canonical, drafted_with_flag); the 4 reference cards inherit the corrected framing.

**Observation**: All 6 existing descriptions say "KTX broadcasts the trigger text into chat" -- but source shows KTX stuffcmds ONE player to say the trigger word; the rest of the f_ chain (other clients auto-replying) is client-side alias behavior that depends on those clients having their own f_xxx aliases configured. The end-group picks the first player found in entity iteration order; the start-group uses `self` (the last-ready player whose ready-state triggered the match countdown).

**Source evidence**: src/match.c:406-409 (end group, `EndMatch` loop with `f_xxx_done` flag); src/match.c:2939-2942 (start group, `PlayerReady` stuffcmds self).

**Recommendation**: Apply the canonical-card v2 framings; the reference cards already point at canonicals so they pick up the corrected framing transitively.

---

### F4: `k_on_start_f_*` hoonymode exception missing from existing description

**Verdict**: ACTIONABLE

**Cards involved**: `k_on_start_f_modified` (canonical, drafted_with_flag); reference cards inherit.

**Observation**: Existing descriptions do not mention that the k_on_start_f_* group does NOT fire in hoonymode matches. Source: `PlayerReady()` branches to `HM_all_ready()` when `isHoonyModeAny()` is true, bypassing the k_on_start_f_* cvar checks entirely.

**Source evidence**: src/match.c (PlayerReady -- isHoonyModeAny() branch)

**Recommendation**: Add the hoonymode exclusion to the canonical card's Effect.

---

### F5: `k_dmgfrags` LGC interaction missing from existing description

**Verdict**: ACTIONABLE

**Cards involved**: `k_dmgfrags` (drafted_with_flag)

**Observation**: Existing description does not mention that enabling LGC mode forcibly clears `k_dmgfrags` to 0. Both cannot be active simultaneously; LGC activation silently wins.

**Source evidence**: src/commands.c:7869-7871

**Recommendation**: Add the LGC interaction bullet to k_dmgfrags Effect (already present in the v2 draft).

---

### F6: `stats`/`effi` alias relationship -- existing descriptions diverge

**Verdict**: ACTIONABLE

**Cards involved**: `stats` (drafted_with_flag), `effi` (drafted)

**Observation**: `stats` and `effi` share the `PlayerStats` handler byte-for-byte (functionally identical aliases). But their existing L1 descriptions diverged: existing `stats` says "post-match only" (WRONG -- F1 above), existing `effi` says "mid-match only" (CORRECT). The v2 drafts standardize both to mid-match, post-apply both should carry identical Effect/Permission/Match-state content.

**Source evidence**: src/commands.c:704 + src/commands.c:705 (both registrations dispatch to the same handler).

**Recommendation**: Apply-pass-author verifies post-apply state has consistent content for stats and effi (they're aliases; F1's fix on `stats` should bring it in line with `effi`).

---

### F7: Cross-batch state-printer family See-also threading -- CONFIRMED CLEAN

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `scores`, `stats`, `effi`, `laststats`, `lastscores`, `lastscoresktx`

**Observation**: All 6 state-printer cards in this batch include `fpslist` and/or `rules` in See-also (state-printer family siblings from the prior Server config & network batch, shipped 2026-05-23/24). Symmetric -- the prior `fpslist` and `rules` cards already reference `scores`/`stats`/`effi`. Cross-batch state-printer family threading is coherent and bidirectional.

**Recommendation**: No action needed. Documents that the cross-batch synthesis worked as intended.

---

### F8: Canonical-card pattern consistency across 5 applications -- CONFIRMED CLEAN

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: 12 cards (`k_on_end_f_*` trio + `k_on_start_f_*` trio + `lastscores`/`lastscoresktx` pair + `+scores`/`-scores` pair + `+wp_stats`/`-wp_stats` pair)

**Observation**: Canonical-card pattern applied 5 times in this batch across 12 of the 19 cards. Each canonical card has full v2 description; each reference card has minimal pointer + delta. Pattern applied consistently; no formatting drift between applications.

**Recommendation**: No action needed. Documents that the per-card skill's canonical-card discipline scales cleanly to a batch with high sibling-pair density.
