# ktx-l1-rewrite drafts -- batch 2026-05-25

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill. Apply-pass-author
reviews each card, applies clean drafts, hand-edits flagged-drafts after
verifying the surfaced contradiction. Drafts do NOT auto-apply to L1
(`entities.description`); the apply pass is a separate phase.

---

## k_ann (KTX cvar, Spectator chat & visibility -- Shape 3)

- **Status**: drafted
- **Source**: src/spectate.c:180 (enter loop), src/spectate.c:239 (disconnect loop); registration src/world.c:943
- **Catalog line**: 17100
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether "Spectator <name> entered/left the game" messages are shown to players during a live match. Spectators always receive these messages regardless of this setting; it only governs whether players also see them.
>
> 0 = spectator join/leave messages are hidden from players during a live match.
> 1 = spectator join/leave messages are shown to players during a live match.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in server config).

`RegisterCvar("k_ann")` in `world.c:943` with no default argument (evaluates to 0). No `cvar_toggle_msg`, `cvar_fset`, or `cvar_set` site anywhere in KTX src. The cvar is read in two loops in `spectate.c` (spectator connect + disconnect) as a recipient-scope modifier, not as a gate. Both read sites use the same ternary: when `match_in_progress == 2 && !k_ann`, the iterator is `find_spc` (spectators only); otherwise `find_client` (all clients). No command handler modifies this cvar at runtime.

### Proposed draft

```
Controls whether "Spectator <name> entered/left the game" messages are delivered to players during a live match.

Effect:
  0 = during a live match, spectator join/leave notifications go to spectators only; players do not see them.
  1 = during a live match, spectator join/leave notifications go to all connected clients (players and spectators).
  Outside a live match, join/leave notifications always reach all clients regardless of this setting.

Permission:  server config only
Default:     0

Example:
  # server.cfg -- show spectator join/leave to everyone during a match
  k_ann 1

See also: k_spectalk (controls whether spectator chat is visible to players mid-match), k_sayteam_to_spec (controls whether team-say messages reach spectators), k_spec_info (spectator status panel shown to players mid-match), silence (mutes a specific spectator from sending chat)
```

### Notes

- Recast is mostly mechanical v1->v2: split "Set by" into Permission, added Effect slot with the value enum, added the "outside a live match" clarifying bullet (source-verified: the ternary requires BOTH `match_in_progress == 2` AND `!k_ann` -- so at default 0, pre-match and post-match messages still reach all clients).
- No paired command; no match-state constraint on the set operation (config-only); Match-state line omitted per Shape 3 template.
- See-also replaces the existing description's implied forward reference to a spectator-visibility concept note with concrete sibling L1 entity links from the same batch.
- The "outside a live match" bullet is new content not in the existing description; source-verified and action-relevant (prevents confusion: "why do spectator join messages appear during warmup even with k_ann 0?").

---

## k_sayteam_to_spec (KTX cvar, Spectator chat & visibility -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:864 (registration), src/world.c:1441 (FixSayTeamToSpecs), src/g_cmd.c:297,528 (ClientSay gate)
- **Catalog line**: 17131
- **Anchor**: v1.36-1633-g67253dc

### Current description

> KTX policy controlling the engine cvar 'sv_sayteam_to_spec' based on match state.
>
> 0 = specs never see player teambind broadcasts.
> 1 = specs see teambinds only during a live match.
> 2 = specs see teambinds only during prewar (inverse of 1).
> 3 = specs always see teambinds.
>
> Default: 0. Recommended: 1 (typical server config).
> Set by: server config.
> See also: QW team-chat visibility concept note.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in server config).

`RegisterCvar("k_sayteam_to_spec")` in `world.c:864` with no default argument (evaluates to 0). No `cvar_toggle_msg`, `cvar_fset`, or `cvar_set` site for the KTX cvar itself. The cvar is read by `FixSayTeamToSpecs()` (world.c:1441), which translates the 4-value policy to a binary value written into `sv_sayteam_to_spec` via `cvar_fset`. `FixSayTeamToSpecs` is called from `FixRules` every server frame, so the engine cvar is live-updated. No command handler modifies `k_sayteam_to_spec` at runtime.

### Proposed draft

```
KTX policy cvar that controls whether spectators receive team-chat messages (say_team) from players, based on match state.

Effect:
  0 = spectators never receive player say_team messages.
  1 = spectators receive player say_team messages only during a live match.
  2 = spectators receive player say_team messages only during prewar (inverse of 1).
  3 = spectators always receive player say_team messages.

  KTX recalculates the engine's sv_sayteam_to_spec on every server frame based on the
  current match state -- no admin action is needed when the match starts or ends.

  Note: even when this cvar enables forwarding, only say_team messages that contain
  teamplay macro output are forwarded to spectators. Plain say_team messages without
  macros are treated as private and do not reach spectators regardless of this setting.

Permission:    server config only
Default:       0.  Recommended: 1 (typical competitive server config)

Example:
  # server.cfg -- specs see team-say during live match only
  k_sayteam_to_spec 1

See also: k_spectalk (controls whether spectators can send chat to players), k_spec_info (spectator status panel shown to players mid-match), silence (mutes a specific spectator from chatting), k_ann (spectator join/leave message visibility to players)
```

### Notes

- FLAG: The existing description uses "teambind broadcasts" throughout. Source shows the gate operates on `say_team` messages. The community shorthand "teambind" is imprecise in L1 context -- the correct term is "say_team" or "team-chat messages." Recast uses "say_team messages" and "team-chat messages." Apply-pass-author should confirm this terminology change is the intended direction.
- FLAG: The existing description omits a key behavioral nuance at `g_cmd.c:528-533`: even when `sv_sayteam_to_spec` is enabled, the `ClientSay` gate also requires the message to contain `$\` (the `fake` flag -- teamplay macro output marker). Plain `say_team` messages without macros are treated as private team messages and do not reach spectators. The v2 recast surfaces this as a Note bullet in Effect. Apply-pass-author should verify the user-facing phrasing ("teamplay macro output") is adequately clear; an L3 concept note would be the right place for a fuller explanation.
- Additionally, the `g_cmd.c` gate also checks that the spec is tracking a player on the sending player's team (or has a matching stored team). Specs tracking a player on the opposing team do not receive the message even when both conditions above are met. This is a team-membership filter, not a configuration knob -- omitted from Effect (it's an always-on routing rule, not a user-configurable behavior) but noted here for completeness.
- The existing See-also cites "QW team-chat visibility concept note" which does not exist. Replaced with concrete sibling L1 entity cross-links from this batch per the no-forward-references rule.
- `RegisterCvar` (no `Ex`) uses empty string default, which evaluates to integer 0. The existing description's "Default: 0" is correct.
- The "Recommended: 1" note is preserved. MVDSV's own built-in default for `sv_sayteam_to_spec` is `"1"` (confirmed in mvdsv/src/sv_user.c:33), supporting the conventional direction of value 1 for competitive play.

---

## k_spectalk (KTX cvar, Spectator chat & visibility -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:860
- **Catalog line**: 17197
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server-wide policy for whether spectators may publicly chat to players during a live match.
>
> 0 = specs are muted to players during the live match (they can still chat in prewar / post-match).
> 1 = specs can chat to players at all times.
>
> Default: 0.
> Set by: server config or 'spectalk' admin command in-game (match-gated for non-admins).
> See also: QW team-chat visibility concept note.

### Shape classification

Shape 1 (cvar + paired toggle command, binary flip).

`ToggleSpecTalk` in commands.c:3252 flips `k_spectalk` via `cvar_fset` + manual broadcast -- structurally identical to `cvar_toggle_msg` helper in other Shape 1 instances; the implementation detail differs but the pattern (cvar + bare command that binary-flips it) is Shape 1. Handler has `match_in_progress && !is_adm(self)` early-return, consistent with the Shape 1 "admin can toggle mid-match" model.

### Proposed draft

```
Server-wide policy for whether spectators may chat publicly to players during a live match.

Effect:
  0 = spectators' messages are routed to other spectators only; players cannot hear them.
  1 = spectators' messages reach all players.

  When a match starts, KTX copies this value to sv_spectalk (coop matches always enable spec
  talk regardless of this setting). When a match ends, sv_spectalk is unconditionally reset to
  1 -- spectators can always chat to players in prewar and post-match regardless of k_spectalk.

Permission:    server config or 'silence' admin command in-game.
Match-state:   pre-match: any player or admin spectator. Mid-match: admin only (non-admins silently refused).
Default:       0.

Example:
  # server.cfg -- silence spectators during competitive matches (default)
  k_spectalk 0

  # Toggle at runtime (admin, any time):
  silence

See also: silence (paired toggle command), k_sayteam_to_spec (team-chat-to-spec policy), k_ann (spec join/leave announcements), k_spec_info (spectator info-bitmask)
```

### Notes

- FLAG: The existing description's Set-by line names `'spectalk'` as the in-game toggle command. Source shows the paired toggle is `silence` (registered at commands.c:745, handler `ToggleSpecTalk`). There is no `spectalk` command in KTX. Apply-pass-author: update Set-by to `'silence'` when applying.
- The existing description's "prewar / post-match" phrasing is consistent with source behavior: sv_spectalk is reset to 1 at match-end (match.c:316), so the k_spectalk=0 suppression is only active during a live match. Recast preserves this semantics with clearer wording.
- `ToggleSpecTalk` uses `cvar_fset` (not `cvar_toggle_msg`). During a live match (match_in_progress == 2), it also updates `sv_spectalk` AND `fpd` bit 64 as side effects. These downstream effects belong on the `silence` card (card 8 in this batch); only the match-start sync behavior is surfaced here as it's user-observable from the k_spectalk side.
- Permission framing: CF_PLAYER | CF_SPC_ADMIN means players invoke without admin gate; spectators need admin rights. The match_in_progress && !is_adm gate in the handler limits mid-match toggles to admins. Pre-match: any player or admin spectator. The Match-state line captures both phases.
- Mode presets affect this cvar: the duel preset hardcodes `k_spectalk 0`; CA/wipeout presets hardcode `k_spectalk 1`. A mode-switch pre-match overrides whatever server.cfg set. This is a mode-preset behavior, not surfaced in the description (no user-actionable knob here; mode presets are a separate concern).
- `RegisterCvar` (no `Ex`) -- default is empty string which evaluates to 0. The existing "Default: 0" is correct.
- The existing See-also cites "QW team-chat visibility concept note" which does not exist. Replaced with sibling L1 entity cross-links per the no-forward-references rule.

## nospecs (KTX command, Spectator chat & visibility -- Shape 7b)

- **Status**: drafted
- **Source**: src/vote.c:999
- **Catalog line**: 17286
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts or withdraws the caller's vote to enable No-spectators mode. When the vote passes (or an admin sets it directly), all spectators are disconnected except VIPs, real admins, and coaches. Non-admins require at least 2 players present to vote. During a live match the command only reports the current on/off state.
> 
> Default: off (_k_nospecs = 0).
> Set by: player vote ('nospecs') or admin command; vote threshold determined by k_vp_nospecs.

### Shape classification

Shape 7b (continuous toggle vote -- no time-box, no yes/no).

Handler toggles `self->v.nospecs` per-player vote flag, broadcasts running tally, and calls `vote_check_nospecs()` which reads `k_vp_nospecs` threshold via `get_votes_req(OV_NOSPECS, true)`. No `electguard`, no timeout. Re-running withdraws. Sole state cvar is `_k_nospecs` (registered at world.c:785 -- valid L1 entity).

### Proposed draft

```
Casts (or withdraws) your vote to enable or disable No-spectators mode.

Effect:
- Toggles your vote and broadcasts the running tally. Re-running withdraws your vote.
- When threshold is met (or an admin votes alone): flips `_k_nospecs` and broadcasts
  "No spectators mode on/off by majority vote" (or "by admin veto").
- On activation: all current spectators are disconnected except non-kickable VIPs,
  admin/rcon VIPs, real admins, and coaches.
- While active: new spectator connections are refused ("No spectators mode, you can't
  connect"). A coach who loses the coach role is also disconnected.
- If all players leave before the match starts while mode is on, the mode resets to off
  automatically.
- Direction-sensitive vote minimum: turning nospecs ON requires at least 2 votes;
  turning it OFF requires at least 1 vote.

Prerequisites: Non-admins need at least 2 players present to vote nospecs ON (when mode
is currently off).

Permission:  any player or admin spectator
Match-state: pre-match only (mid-match: reports current on/off state without casting a vote)

Example:
  nospecs        # casts your vote; tally broadcast to all players
  nospecs        # re-running withdraws your vote

See also: _k_nospecs (state cvar this vote controls), k_vp_nospecs (vote threshold percentage)
```

### Notes

- `_k_nospecs` is registered via `RegisterCvar("_k_nospecs")` at world.c:785 with the comment "internal usage, will reject spectators connection" -- it IS a valid L1 entity (not a purely runtime-created cvar), so the See-also cross-link is legitimate.
- Direction-sensitive vote minimum is sourced from vote.c:383-389: when `fofs == OV_NOSPECS && cvar("_k_nospecs")` (i.e. mode is ON, voting to turn it off), minimum is 1 vote. When mode is OFF (turning it on), minimum is 2 votes. The existing description only mentions "at least 2 players present" which conflates the `CountPlayers() < 2` player-count guard (vote.c:1011-1020) with the vote-count minimum -- these are two separate mechanisms.
- The connection-blocking effect (spectate.c:123-153) is absent from the existing description. On-pass behavior disconnects existing spectators; the persistent gate (nospecs_canconnect) refuses new connections. Both are user-observable and included in Effect.
- Admin bypass: `is_adm(self)` allows an admin to vote alone regardless of player count (vote.c:1011). On pass, `is_admins_vote(OV_NOSPECS)` triggers the "by admin veto" path even at sub-threshold vote counts (vote.c:947-960).
- The existing description's "except VIPs, real admins, and coaches" is correctly directional; recast adds specificity (non-kickable VIPs, admin/rcon VIPs) sourced from ALLOWED_NOSPECS_VIPS definition at include/g_local.h:755.
- No forward references inserted. k_vp_nospecs and _k_nospecs are confirmed L1 entities (world.c:831 and world.c:785 respectively).

## silence (KTX command, Spectator chat & visibility -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:745
- **Catalog line**: 17314
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles whether players can hear spectators' chat (the k_spectalk setting). Announces the new state to all players each time.
>
> Outside a match: any player may use it.
> During a live match: admin-only.
>
> Set by: any player outside a match; admin command during a live match.
> See also: QW team-chat visibility concept note.

### Shape classification

Shape 1 (cvar + paired toggle command, binary flip).

Handler `ToggleSpecTalk` flips `k_spectalk` via `cvar_fset` and broadcasts the new state -- structurally identical to Shape 1 cvar+toggle pairs. The dispatch note confirms Shape 1 by symmetry with `k_spectalk` (drafted Shape 1 earlier in this batch despite `cvar_fset` vs `cvar_toggle_msg` implementation difference; the structural relationship is identical). The `match_in_progress && !is_adm(self)` early-return is the standard Shape 1 admin gate.

### Proposed draft

```
Admin command that toggles spectator talk (k_spectalk) -- whether players can hear spectators' chat.

Effect:
- Flips k_spectalk between 0 and 1 and broadcasts the new state to all players.
- During a live match only: also updates sv_spectalk immediately (so the engine enforces the
  change in real time without waiting for the next match start) and updates the fpd serverinfo
  bitmask (bit 64 cleared when spectalk turns ON; bit 64 set when spectalk turns OFF).
- Broadcast wording differs by phase: in-match uses "Spectalk on/off: players can[/no longer]
  hear spectators"; pre-match uses "players can[/cannot] hear spectators during game".

Permission:    pre-match: any player or admin spectator. Mid-match: admin only (non-admins silently ignored).
Match-state:   any time (effect differs by match phase -- see Effect above)

Example:
  silence        # pre-match: any player toggles spectalk
  silence        # mid-match: admin only; flips k_spectalk + sv_spectalk + fpd bit 64

See also: k_spectalk (paired cvar this toggles), k_sayteam_to_spec (team-chat-to-spec policy), nospecs (vote to disconnect spectators entirely), k_ann (spec join/leave announcements)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN: players may invoke without admin rights; spectators may invoke only if they hold admin rights. Pre-match, this means any player or admin spectator. Mid-match, the `match_in_progress && !is_adm(self)` handler gate narrows to admins only (players and spectators alike must be admin to proceed). Non-admins mid-match get a silent early-return (no message printed).
- sv_spectalk update is mid-match only (match_in_progress == 2). Outside a live match, only k_spectalk is written; sv_spectalk stays at whatever value match.c:316 set on match-end (always 1). The sv_spectalk side-effect is an Effect bullet not a Prerequisite -- it's a downstream consequence, not a user condition.
- fpd bit 64 toggling is mid-match only (same branch as sv_spectalk). Not surfaced in user-facing jargon; the Effect bullet uses "fpd serverinfo bitmask" rather than the raw bit number, keeping it minimally technical while still observable.
- The existing description's "See also: QW team-chat visibility concept note" references a concept note that does not exist. Replaced with sibling L1 entity cross-links per the no-forward-references rule.
- The existing description's "any player outside a match" is directionally correct for players but misses admin spectators. CF_PLAYER | CF_SPC_ADMIN grants admin spectators pre-match access. Corrected in Permission line.
- k_spec_info is parked (this batch) so excluded from See-also to avoid pointing at an entity whose L1 description status is uncertain. k_ann is confirmed drafted (this batch) and is a valid sibling cross-link.

---

## Cross-card consistency notes

Sweep date: 2026-05-25. Sonnet 4.6 high reasoning. Source verified against KTX `v1.36-1633-g67253dc`.

---

### Finding 1 -- silence misdescribed as per-spectator mute (k_ann, k_sayteam_to_spec See-also)

**Cards affected**: k_ann, k_sayteam_to_spec.

k_ann's See-also (line 50 of draft): `silence (mutes a specific spectator from sending chat)`.
k_sayteam_to_spec's See-also (line 113 of draft): `silence (mutes a specific spectator from chatting)`.

**What source says**: `silence` is registered at `commands.c:745` as `{ "silence", ToggleSpecTalk, 0, CF_PLAYER | CF_SPC_ADMIN, CD_SILENCE }`. `ToggleSpecTalk` flips the server-wide `k_spectalk` cvar and broadcasts the new state to all players. It is a GLOBAL server-wide toggle, not a per-spectator mute. No per-spectator mute command exists in the KTX command table.

**Apply-pass correction**: Replace "silence (mutes a specific spectator from sending chat)" with "silence (server-wide toggle: flips whether spectators can chat to players)" on both cards. The silence card itself already carries the correct framing -- the k_ann and k_sayteam_to_spec See-also descriptions are wrong.

---

### Finding 2 -- k_spectalk Permission line calls silence an "admin command" (k_spectalk)

**Card affected**: k_spectalk.

k_spectalk's proposed draft Permission line reads: `Permission: server config or 'silence' admin command in-game.`

**What source says**: `silence` is `CF_PLAYER | CF_SPC_ADMIN` -- any player OR admin spectator, pre-match. The word "admin" in "admin command" incorrectly implies admin-only access. The command is admin-only ONLY mid-match (due to the `match_in_progress && !is_adm(self)` gate in `ToggleSpecTalk`), not inherently. The silence card's own Permission line correctly reads: `Permission: pre-match: any player or admin spectator. Mid-match: admin only`. The k_spectalk Permission line is inconsistent with the silence card and with CF_PLAYER | CF_SPC_ADMIN.

**Apply-pass correction**: Rewrite k_spectalk's Permission line to: `Permission: server config, or via 'silence' command (pre-match: any player or admin spectator; mid-match: admin only).` This aligns with the silence card framing and the CF_* registration.

---

### Finding 3 -- k_spectalk See-also includes k_spec_info; silence See-also excludes it (k_spectalk vs silence)

**Cards affected**: k_spectalk, silence.

k_spectalk's proposed draft See-also includes `k_spec_info (spectator info-bitmask)`. The silence card's Notes explicitly state: "k_spec_info is parked (this batch) so excluded from See-also to avoid pointing at an entity whose L1 description status is uncertain." Both cards are drafted in the same batch; the exclusion rationale applies equally to k_spectalk.

**What source says**: k_spec_info IS registered at `world.c:965` and IS a valid L1 entity. The question is whether cross-linking to a parked (unclassified) entity is appropriate in an apply-pass draft. Per the silence card's own logic: it is not.

**Apply-pass correction**: Remove k_spec_info from k_spectalk's See-also for consistency with the silence card's treatment, OR add a matching flag note to the k_spectalk card explaining why k_spec_info is retained despite being parked. Pick one direction; apply to both cards symmetrically.

---

### Finding 4 -- k_sayteam_to_spec value 1 described as "only during a live match" (k_sayteam_to_spec)

**Card affected**: k_sayteam_to_spec.

The proposed draft's Effect section for value 1: `spectators receive player say_team messages only during a live match.` Similarly value 2: `only during prewar (inverse of 1)`.

**What source says** (`world.c:1456-1459`):
```c
case 1:
    desired_value = (match_in_progress ? 1 : 0);
```
`match_in_progress` is truthy for BOTH countdown (`match_in_progress == 1`, set when status becomes "Countdown") AND live match (`match_in_progress == 2`). Value 1 therefore enables forwarding during BOTH the countdown phase and the live match, not just the live match. Value 2 (inverse) enables forwarding only when `match_in_progress == 0` (standby/warmup), which is neither "prewar" nor "live match."

The existing description uses the same "live match" / "prewar" shorthand. The drafts carry the imprecision forward.

**Apply-pass correction**: Value 1 description: "spectators receive player say_team messages only while a match is in progress (countdown or live)." Value 2 description: "spectators receive player say_team messages only outside a running match (warmup/standby)." The "inverse of 1" parenthetical is fine to retain but should note it covers pre-countdown standby, not just the pre-war fire-before-match phase.

---

### Finding 5 -- cvar_fset vs cvar_toggle_msg Shape 1 classification (k_spectalk, silence vs k_spec_info parked)

**Cards affected**: k_spectalk, silence (drafted Shape 1); k_spec_info, infolock, infospec (parked, Shape 1 ruled out).

The parked k_spec_info card explicitly addresses this: the primary park reason is the two-command/two-bit/asymmetric-permission pattern, NOT cvar_fset alone. The card states: "cvar_fset alone shouldn't be disqualifying since k_spectalk+silence accepted it." This is internally consistent.

k_spectalk and silence were accepted as Shape 1 because they have ONE cvar + ONE command with a symmetric binary flip, matching the structural Shape 1 pattern. The `cvar_fset` vs `cvar_toggle_msg` difference is an implementation detail; the shape is identified by structural pattern, not source signature. The parked family deviates on the structural pattern (two commands, two bits, asymmetric permissions), which is the actual disqualifier.

**Assessment**: No inconsistency. Classification is principled. No apply-pass correction needed.

---

### Finding 6 -- k_spec_info bit ownership (infospec, infolock, k_spec_info)

**Cards affected**: infospec, infolock, k_spec_info (all parked).

`MI_ON = 1<<0` (decimal 1) exclusively owned by `infospec`. `MI_ADM_ONLY = 1<<1` (decimal 2) exclusively owned by `infolock`. Confirmed against `include/g_consts.h:282-283` and handler source at `commands.c:7205-7247`.

No cross-card contradiction. Each parked card correctly identifies which bit it toggles and what the user-observable effect is. moreinfo's dependency on MI_ON (blocks with "Spec info is turned off by server" when infospec is off) is correctly surfaced on the infospec card only -- not mis-attributed to infolock.

**Assessment**: Bit ownership is clean. No apply-pass correction needed.
