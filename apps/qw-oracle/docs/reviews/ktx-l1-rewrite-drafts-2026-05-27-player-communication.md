# ktx-l1-rewrite drafts -- batch 2026-05-27 (Player communication)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

**FINAL KTX L1 BATCH** -- Player communication closes the KTX L1 chunked-mode
catalog at 100%. 14 batches shipped cumulatively (Server config & network ->
Spectator chat -> Voting -> Mode selection -> Scoring & stats -> Mode-scoped
knobs -> Frogbot -> Admin & permissions -> Demo & spectator -> Match flow ->
Gameplay rules -> Internal state -> Race -> **Player communication**).
Cumulative: 613 of 633 KTX L1 entities drafted under v2; 14-entity gap
audit follow-up active (likely contains the userinfo-key pile referenced
cross-batch from this drafts file).

Sections sub-grouped by family per the handoff:

- **Shape 6 family** (stateful + one-shots + multi): 7 entities -- `mmode`,
  `multi`, `s-p`, `s-r`, `s-m`, `s-l`, `s-t`.
- **Shape 7 fan-out + canonical-card pattern** (ksound family): 6 entities
  -- `ksound1` (canonical), `ksound2` / `ksound3` / `ksound4` / `ksound5` /
  `ksound6` (reference cards).
- **Shape-less prose-wrap message commands**: 3 entities -- `killer`,
  `victim`, `newcomer`.
- **Shape-less other commands**: 2 entities -- `tpmsg`, `report`.

Verdict counts: **15 drafted_clean + 3 drafted_with_flag + 0 parked = 18
entities**. No halt-on-novelty triggers (1 or 4) fired.

---

## Shape 6 family (stateful + one-shots)

<!-- VERDICT: drafted_with_flag -->
## mmode (KTX command, Player communication -- Shape 6 stateful)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:938
- **Catalog line**: 13574
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets your message mode -- the implicit recipient for subsequent messaging and say macros. Arguments: `off` (no target), `player <id|name>`, `team <name>`, `multi` (open multi-message editor), `name`, `rcon` (requires rcon password or VIP rights), `.` (last player sent to), `,` (last player received from), `last` (restore previous mode). With no argument, operates on your current stored mode. An unrecognized argument prints the usage line.
>
> Set by: any player via 'mmode' command (per-player state).

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- stateful side. Reasoning: handler at g_cmd.c:1092 writes starred userinfo keys via `SetUserInfo(... SETUSERINFO_STAR)` for `*mm` (mode), `*mp` (player id), `*mt` (team name), `*mu` (multi bitmask). `ClientSay` at g_cmd.c:287 reads `*mm` to route subsequent `say` messages. One-shot counterparts (s-p, s-r, s-m, s-l, s-t) are registered as `dummy` handlers and intercepted by `ClientSay`. Canonical Shape 6 instance per worked-examples.md.

Note on "multi" framing: existing description says "open multi-message editor" -- source shows `mmode multi` dispatches to `multi_do(2, true)` which PRINTS the current multi set (from_mmode=true path). It is NOT an editor; it displays the current *mu bitmask recipients and sets *mm to MMODE_MULTI. Flagging as localized framing correction.

### Proposed draft

```
Sets your 'talk-to' target for follow-up 'say' messages. Subsequent 'say' commands are routed to the chosen recipient instead of the public channel.

Not to be confused with the engine's 'messagemode 1/2/3' commands -- those open the client-side chat input; 'mmode' sets the server-side routing target for what you type.

Effect:
  Sets the recipient-mode stored in your per-player state. 'say' reads this to route your next message.

  Modes:
    off             -- no target; 'say' uses normal broadcast
    player <id>     -- route to a specific player (by id or name)
    team <name>     -- route to a named team
    multi           -- route to your configured multi recipient set (built with 'multi')
    name            -- next 'say' message is used as a /name command (rename yourself)
    rcon            -- next 'say' message is sent as a server console command

  Shortcut args (for player mode):
    .               -- set target to the last player you sent a message to
    ,               -- set target to the last player who messaged you
    last            -- restore the previous mmode setting

  With no argument, re-applies the currently stored mode (prints current state).

Prerequisites: 'rcon' mode requires either the server's rcon password as a third argument ('mmode rcon <password>') or VIP rcon rights.

Permission:    any player or spectator
Default:       N/A (command)

Example:
  mmode player 3          ; target player #3
  say hello               ; sent privately to player #3
  mmode .                 ; keep targeting the same player (shortcut)
  mmode off               ; return to public broadcast

See also: multi (manages the multi recipient set used by 'mmode multi'), s-p (one-shot send to a specific player), s-r (one-shot reply to last sender), s-m (one-shot send to multi set), s-l (one-shot resend to last target), s-t (one-shot send to a group)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:938)
- FLAG: existing description calls `mmode multi` an "open multi-message editor" -- source shows it calls `multi_do(2, true)` which prints the current multi set and confirms/sets MMODE_MULTI; there is no editor. Apply-pass: change "open multi-message editor" framing to "route to your multi recipient set (configure it with 'multi')".
- Verification: `*mm` / `*mp` / `*mt` / `*mu` / `*ml` (`last` shortcut reads `*ml`) all confirmed as `SetUserInfo(... SETUSERINFO_STAR)` writes in g_cmd.c:1092 handler. `ClientSay` at g_cmd.c:368 confirmed reading `*mm` to dispatch to MMODE_PLAYER/TEAM/MULTI/NAME/RCON branches.
- `mmode rcon`: access requires `rcon_password` match or `VIP_IsFlags(self, VIP_RCON)` -- source at g_cmd.c:1216-1226. The rcon mode in ClientSay (g_cmd.c:394) is currently commented out ("WARNING: FULL ACCESS") -- rcon mode is present in the mmode handler but the ClientSay rcon dispatch is gated; noted as operational detail (see F8 in cross-card consistency notes for apply-pass-author decision on whether to surface in L1 body).
- Concept-note candidate: the full mmode + s-* family + say routing system merits an L3 concept note ("KTX private messaging system") -- see F10.

---

<!-- VERDICT: drafted_with_flag -->
## multi (KTX command, Player communication -- Shape 6 stateful sibling)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:939
- **Catalog line**: 13601
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Edit or print your multi recipient set -- the custom group of players targeted by the s-m private message command.
>
> multi = name1 name2 ... = replace the set with the named players.
> multi + name1 ...       = add players to the set.
> multi - name1 ...       = remove players from the set.
> multi ?                 = print the current set.
> multi ?? <n>            = print the set encoded by the numeric value n.
>
> Players are identified by client id or name.
> Set by: player command.

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- stateful sibling (manages the `*mu` bitmask used by the multi-recipient mode). Reasoning: handler at g_cmd.c:828 calls `multi_do(1, false)`. `multi_do` manages the `*mu` bitmask (per-player bitmask of client-slot bits). Note: `from_mmode=false` means `multi` does NOT set `*mm` to MMODE_MULTI -- only `mmode multi` does that (line 982: `if (from_mmode) SetUserInfo(self, "*mm", MMODE_MULTI, SETUSERINFO_STAR)`). So `multi` is the dedicated *mu manager; it is a Shape 6 stateful sibling that maintains the multi-set state consumed by `s-m` and by `mmode multi`.

### Proposed draft

```
Manages your multi recipient set -- the named group of players that 's-m' and 'mmode multi' send messages to.

Effect:
  Modifies or queries the per-player multi set stored in your client state.

  Operations:
    multi = <id/name> ...   -- replace the set with the listed players
    multi + <id/name> ...   -- add players to the set
    multi - <id/name> ...   -- remove players from the set
    multi ?                 -- print the current set by name
    multi ?? <n>            -- decode and print the set encoded by numeric value n

  Players are matched by client id or name.

Permission:    any player or spectator
Default:       N/A (command)

Example:
  multi = 2 flash          ; set the multi group to player #2 and 'flash'
  multi + doom             ; add 'doom' to the group
  s-m heading to rl        ; send 'heading to rl' privately to all three

See also: s-m (sends a message to your multi set), mmode (use 'mmode multi' to set multi as your persistent routing target), s-p (one-shot send to a specific player)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:939)
- FLAG: existing description labels `multi` as "Edit or print your multi recipient set" -- source shows `multi` does NOT set `*mm` to MMODE_MULTI when called directly (`from_mmode=false`). Only `mmode multi` activates multi-routing mode. Apply-pass: clarify that `multi` manages the *set* but does not activate multi-routing mode; use `mmode multi` to make say-messages route to the set.
- Verification: `multi_do(1, false)` at g_cmd.c:828. The `from_mmode` guard at line 982 (`if (from_mmode) SetUserInfo(self, "*mm", ...)`) confirmed: direct `multi` calls do NOT write *mm. The *mu write at line 985 happens in both cases.
- The existing description's operations table (=, +, -, ?, ??) is accurate per source; the v2 draft preserves it in Effect format.

---

<!-- VERDICT: drafted -->
## s-p (KTX command, Player communication -- Shape 6 one-shot)

- **Status**: drafted
- **Source**: src/commands.c:933
- **Catalog line**: 13747
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a private message to one specified player. Usage: s-p <id|name> <text>. Only the named recipient sees the message. Fails with a usage hint if arguments are missing, or "client not found" if the player is not connected. During a match, messages do not cross the player/spectator divide. The target is remembered so 's-l' can resend to them.
>
> Set by: any player or spectator ('s-p <id|name> <text>').

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- one-shot side. Reasoning: registered as `dummy` handler at commands.c:933; intercepted by `ClientSay` at g_cmd.c:338 (`if (streq(arg_2, "s-p")) { s_p(); return true; }`). Handler `s_p()` at g_cmd.c:607 calls `s_common(self, target, str)` which performs the send, then updates `s_last_to` / `s_last_from` pointers for s-l / s-r reply chains.

### Proposed draft

```
Sends a private message to one specified player without setting a persistent routing target.

Effect:
  Delivers the message privately to the named player. Only the recipient sees it.
  Updates your 's-l' reply target (the recipient becomes your last-sent-to player).
  The recipient's 's-r' reply target is also updated to point back at you.

  Recipients see: [<yourname>->]: <text>
  You see:        [->< recipientname>]: <text>

Prerequisites: The named player must be connected ('s-p: client <name> not found' if not).

Permission:    any player or spectator
Match-state:   During a live match, messages do not cross the player/spectator divide.

Example:
  s-p flash heading to rl      ; send privately to player named 'flash'
  s-l sorry wrong button        ; resend to the same target without retyping the name

See also: mmode (sets a persistent routing target so 'say' routes to a player), s-l (resend to your last s-p target), s-r (reply to last player who messaged you), s-t (send to a named group), s-m (send to your multi set)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:933)
- Verification: `dummy` handler confirmed at commands.c:933. ClientSay intercept confirmed at g_cmd.c:338. `s_p()` at g_cmd.c:607 calls `s_common()`. `s_common()` at g_cmd.c:571: checks `match_in_progress && (from->ct != to->ct)` for cross-side block; sets `from->s_last_to = to` and `to->s_last_from = from`.
- Message format "[<yourname>->]" and "[-><recipientname>]" confirmed from `s_common` at g_cmd.c:582-583.

---

<!-- VERDICT: drafted -->
## s-r (KTX command, Player communication -- Shape 6 one-shot)

- **Status**: drafted
- **Source**: src/commands.c:935
- **Catalog line**: 13774
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a private reply to the last player who messaged you (via s-p). Usage: `s-r <text>`. The recipient sees `[<yourname>->]: text`; you see `[-><recipientname>]: text`. Prints "s-r: client not found" if that player is no longer connected. Requires at least one text argument, else prints "usage: s-r txt". Players and spectators cannot exchange private messages during a match. Each send updates the reply chain so `s-r` and `s-l` keep pointing at the right counterpart.
>
> Set by: any player via 's-r' command (distinct from 's-l', which replies to the last player you sent to).

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- one-shot side. Reasoning: registered as `dummy` at commands.c:935; intercepted by `ClientSay` at g_cmd.c:341 (`s_lr(2)`). `s_lr(2)` reads `self->s_last_from` (the player who last messaged you). Calls `s_common()` on match.

### Proposed draft

```
Replies privately to the last player who sent you a message, without specifying their name.

Effect:
  Sends the message to the player stored as your last-received-from contact.
  Updates the reply chain: you become their last-sent-to, they become your last-sent-to.

  Recipients see: [<yourname>->]: <text>
  You see:        [-><recipientname>]: <text>

Prerequisites: Someone must have sent you a message first ('s-r: client not found' if no prior sender or that player has left).

Permission:    any player or spectator
Match-state:   During a live match, messages do not cross the player/spectator divide.

Example:
  ; (someone sent you "gib me at quad")
  s-r on my way              ; reply to them without knowing their name

See also: s-l (reply to the last player you sent a message to), s-p (send to a named player), mmode (set a persistent routing target), s-t (send to a named group)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:935)
- Verification: `dummy` handler confirmed at commands.c:935. `ClientSay` intercept at g_cmd.c:341 (`l=2` -> `s_lr(2)`). `s_lr(2)` at g_cmd.c:646 reads `self->s_last_from`. The "set by" line in the existing description says "any player" but CF flags are `CF_BOTH` -- spectators are also permitted. This is a localized error in the existing description but the proposed draft corrects it. No FLAG needed as the correction is reflected in the Permission line.
- Existing description note "distinct from 's-l'" is correct and user-helpful; preserved implicitly via See-also ordering.

---

<!-- VERDICT: drafted -->
## s-m (KTX command, Player communication -- Shape 6 one-shot)

- **Status**: drafted
- **Source**: src/commands.c:937
- **Catalog line**: 13720
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Send a private text message to every player in your configured multi recipient set (built with the multi command). Usage: s-m <text>. Recipients see the message tagged with the set number. You are not included in your own send; if no recipients are connected it reports "no clients found". During a match the message does not cross the player/spectator divide.
>
> Set by: player command.

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- one-shot side. Reasoning: registered as `dummy` at commands.c:937; intercepted by `ClientSay` at g_cmd.c:353 (`s_m()`). `s_m()` at g_cmd.c:817 reads `iKey(self, "*mu")` (the multi bitmask) and calls `s_m_do(str, m)`.

### Proposed draft

```
Sends a private message to every player in your multi recipient set in one command.

Effect:
  Delivers the message to all players currently in your multi set (configured with 'multi').
  You are excluded from your own send.
  If no set members are connected, prints 'no clients found'.

  Recipients see: [<yourname> <m:<bitmask>>]: <text>
  You see:        [<m:<bitmask>>]: <text>

Permission:    any player or spectator
Match-state:   During a live match, messages do not cross the player/spectator divide.

Example:
  multi = flash doom         ; configure the multi set
  s-m rl at 30               ; send to both flash and doom at once

See also: multi (builds and manages the recipient set), mmode (use 'mmode multi' to route all 'say' messages to the multi set), s-p (one-shot send to a specific player), s-t (send to a named group)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:937)
- Verification: `dummy` handler confirmed at commands.c:937. ClientSay intercept at g_cmd.c:353. `s_m()` at g_cmd.c:817 reads `*mu` via `iKey`. `s_m_do` at g_cmd.c:765: skips self, checks `match_in_progress && (from->ct != to->ct)`, checks bitmask bit. Message format `"[%s <m:%d>]: %s\n"` confirmed at g_cmd.c:787.
- Existing description says "set by: player command" -- CF flags are `CF_BOTH` so spectators are also permitted. Correction reflected in Permission line.

---

<!-- VERDICT: drafted -->
## s-l (KTX command, Player communication -- Shape 6 one-shot)

- **Status**: drafted
- **Source**: src/commands.c:934
- **Catalog line**: 13692
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a direct private message to the player you most recently targeted with s-p. Only that recipient sees the text. Reports "client not found" if no prior s-p target exists or that player has left. Players and spectators cannot message across the player/spec divide during a match.
>
> Default: n/a (command).
> Set by: any player ('s-l <text>').

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- one-shot side. Reasoning: registered as `dummy` at commands.c:934; intercepted by `ClientSay` at g_cmd.c:341 (`s_lr(1)`). `s_lr(1)` reads `self->s_last_to` (last player you sent a message to via s-p or s-common).

### Proposed draft

```
Resends a private message to the last player you sent a message to, without retyping their name.

Effect:
  Sends to the player stored as your last-sent-to contact (set by any prior s-p or s-l send).
  Updates the reply chain on both sides.

  Recipients see: [<yourname>->]: <text>
  You see:        [-><recipientname>]: <text>

Prerequisites: You must have sent at least one prior message ('s-l: client not found' if no prior target or that player has left).

Permission:    any player or spectator
Match-state:   During a live match, messages do not cross the player/spectator divide.

Example:
  s-p flash heading to rl        ; initial send to 'flash'
  s-l forgot -- got mega too      ; follow-up to the same player

See also: s-r (reply to the last player who messaged you), s-p (send to a named player -- sets your s-l target), mmode (set a persistent routing target for all 'say' messages)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:934)
- Verification: `dummy` handler confirmed at commands.c:934. `ClientSay` intercept at g_cmd.c:341 (`l=1` -> `s_lr(1)`). `s_lr(1)` at g_cmd.c:646: reads `self->s_last_to`. `s_last_to` is set by `s_common` (g_cmd.c:586) on any successful send.
- Existing description says "set by: any player" but CF flags are `CF_BOTH` -- spectators permitted. Corrected in Permission line. No FLAG needed as it's reflected in the proposed draft.

---

<!-- VERDICT: drafted -->
## s-t (KTX command, Player communication -- Shape 6 one-shot)

- **Status**: drafted
- **Source**: src/commands.c:936
- **Catalog line**: 13801
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a private chat message to a named group of clients. Usage: s-t <group> <text>.
>
> Group selectors: "player" = all players, "spectator" = all spectators, "admin" = all admins, or a team name = every member of that team. The message is shown to matched clients as "[<yourname> <t:<group>>]: text" and echoed to you. During a live match, players and spectators cannot exchange these messages (cross-side recipients are skipped). If no clients match the group it prints "s-t: no clients found for team <group>".
>
> Set by: any in-game player or spectator.

### Shape classification

Shape 6 (stateful command + one-shot command pair) -- one-shot side (group variant). Reasoning: registered as `dummy` at commands.c:936; intercepted by `ClientSay` at g_cmd.c:346 (`s_t()`). `s_t()` at g_cmd.c:741 reads the group name argument and calls `s_t_do(str, group)`. No persistent state set.

### Proposed draft

```
Sends a private message to a named group of players in one command.

Effect:
  Delivers the message to all connected clients matching the group selector.
  You are excluded from your own send.
  If no clients match, prints 's-t: no clients found for team <group>'.

  You see: [<t:<group>>]: <text>
  Recipients see: [<yourname> <t:<group>>]: <text>

  Group selectors:
    player       -- all players (active slots)
    spectator    -- all spectators
    admin        -- all admins
    <teamname>   -- all members of the named team

Permission:    any player or spectator
Match-state:   During a live match, messages do not cross the player/spectator divide.

Example:
  s-t blue heading to rl        ; send to all members of team 'blue'
  s-t spectator map is e1m2      ; send to all spectators (useful for casters)

See also: s-m (send to a custom multi recipient set), s-p (send to a specific player), mmode (use 'mmode team <name>' to route all 'say' messages to a team)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (registration row at src/commands.c:936)
- Verification: `dummy` handler confirmed at commands.c:936. ClientSay intercept at g_cmd.c:346. `s_t()` at g_cmd.c:741. `s_t_do` at g_cmd.c:689: loops clients, filters by `tname` matching "player"/ctPlayer, "spectator"/ctSpec, "admin"/is_adm(), or team name. Cross-side check at g_cmd.c:719: `match_in_progress && (self->ct != p->ct)`. Message format `"[%s <t:%s>]: %s\n"` at g_cmd.c:727.
- Group selector `admin` routes to `is_adm(p)` checked clients -- works for both player and spectator admins.

---

## Shape 7 fan-out + canonical-card pattern (ksound family)

<!-- VERDICT: drafted -->
## ksound1 (KTX command, Player communication -- Shape 7 fan-out, canonical card)

- **Status**: drafted
- **Source**: src/commands.c:770
- **Catalog line**: 13412
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 1 (ktsound1.wav) for teammates who have KT sounds enabled. Each recipient's sound is played from their configured sound directory (k_sdir). Only active in team or CTF games. No effect on players with KT sounds disabled.
>
> Set by: any team player (no arguments; see also: 'ksound2', 'ksound3' for other cues).

### Shape classification

Shape 7 fan-out + canonical-card pattern. Reasoning: six near-identical siblings (ksound1-6) all share the `DEF(TeamSay)` handler at commands.c:3377, differing only in the integer arg passed (1-6 -> `ktsound1.wav` through `ktsound6.wav`). No vote-threshold cvar exists (ksound1-6 are not vote commands); the "fan-out" modifier from the shape catalog applies because all six register the same underlying handler with per-value arguments. ksound1 carries the canonical card per the Shape 7 command-per-value fan-out + canonical-card discipline; ksound2-6 are reference cards. The commands are shape-less with respect to the Layer B relational catalog (no cvar pairing, no election, no gate), but the canonical-card fan-out pattern applies structurally.

### Proposed draft

```
Broadcasts team audio cue 1 (ktsound1.wav) to every teammate who has KT sounds enabled in their `kf` bitmask.

Effect:
  For each teammate in a team or CTF game who has the KF_KTSOUNDS bit set in their `kf` userinfo key,
  the server sends a `play ktsound1.wav` stuffcmd to that teammate's client. Teammates without KF_KTSOUNDS
  receive nothing. Spectators never receive ksound broadcasts.
  Each recipient's sound is played from their own sound directory: if the recipient has `k_sdir` set
  in their userinfo, that directory prefix is prepended to `ktsound1.wav`.

Prerequisites: Active game mode must be team or CTF. ksound commands have no effect in 1on1, FFA,
  or other non-team modes.

Permission:    any player (spectators excluded)
Match-state:   any time (warmup and mid-match both work; mode prerequisite is the only gate)

Example:
  Bind a key to ksound1 for quick in-game signalling:
    bind KP_END ksound1
  Teammates with `kf` containing the KTSounds bit will hear ktsound1.wav from their own sound dir.
  (Optional: teammates set `setinfo k_sdir mysounds` to use a custom sound directory.)
  (Optional: set `setinfo kf 1` to enable KTSounds reception; see `kf` for the full bitmask.)

See also: kf (KF_KTSOUNDS bit gates reception), ksound2, ksound3, ksound4, ksound5, ksound6
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:770)
- **Canonical card** for the ksound1-6 family per Shape 7 fan-out + canonical-card pattern. ksound2-6 are reference cards pointing here.
- Verification: TeamSay handler at commands.c:3377 confirmed -- iterates `find_plr()` (players only), checks `isTeam() || isCTF()`, checks `iKey(p, "kf") & KF_KTSOUNDS`, checks same team via `getteam`, then `stuffcmd(p, "play %s%s\n", ...)`. No `match_in_progress` early-return -- warmup works if mode is team/CTF.
- Verification: `k_sdir` is read from the RECIPIENT's userinfo (`ezinfokey(p, "k_sdir")`), not the sender's. This is correctly reflected in the draft.
- Verification: CD descriptions for ksound1-6 are `CD_NODESC // useless command now` -- this is a stale developer comment; the handler still functions as described. Not surfaced in L1 (developer-internal metadata).
- Verification: `find_plr()` iterates only `ctPlayer` entities -- spectators are structurally excluded from reception, regardless of their `kf` setting.

---

<!-- VERDICT: drafted -->
## ksound2 (KTX command, Player communication -- Shape 7 fan-out, reference card)

- **Status**: drafted
- **Source**: src/commands.c:771
- **Catalog line**: 13439
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 2 (ktsound2.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
>
> Set by: any player (in-game command).

### Shape classification

Shape 7 fan-out + canonical-card pattern (reference card; canonical is ksound1). All six siblings share `DEF(TeamSay)` handler with integer arg 1-6.

### Proposed draft

```
Broadcasts team audio cue 2 (ktsound2.wav) to teammates with KT sounds enabled (kf=2 -> ktsound2.wav). See `ksound1` for the full ksound channel behavior -- all six ksound commands share the same mechanism. This command sends sound index 2 instead of 1.

Permission: any player (spectators excluded)

See also: ksound1 (canonical -- full behavior), ksound3, ksound4, ksound5, ksound6, kf (KF_KTSOUNDS bit)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:771)
- Reference card per canonical-card pattern (canonical is ksound1).
- Verification: Registration row confirmed `CF_PLAYER`, handler `DEF(TeamSay)` with arg `2`.

---

<!-- VERDICT: drafted -->
## ksound3 (KTX command, Player communication -- Shape 7 fan-out, reference card)

- **Status**: drafted
- **Source**: src/commands.c:772
- **Catalog line**: 13466
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 3 (ktsound3.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
>
> Set by: any player (in-game command).

### Shape classification

Shape 7 fan-out + canonical-card pattern (reference card; canonical is ksound1). All six siblings share `DEF(TeamSay)` handler with integer arg 1-6.

### Proposed draft

```
Broadcasts team audio cue 3 (ktsound3.wav) to teammates with KT sounds enabled. See `ksound1` for the full ksound channel behavior. This command sends sound index 3 instead of 1.

Permission: any player (spectators excluded)

See also: ksound1 (canonical -- full behavior), ksound2, ksound4, ksound5, ksound6, kf (KF_KTSOUNDS bit)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:772)
- Reference card per canonical-card pattern (canonical is ksound1).

---

<!-- VERDICT: drafted -->
## ksound4 (KTX command, Player communication -- Shape 7 fan-out, reference card)

- **Status**: drafted
- **Source**: src/commands.c:773
- **Catalog line**: 13493
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 4 (ktsound4.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
>
> Set by: any player (in-game command).

### Shape classification

Shape 7 fan-out + canonical-card pattern (reference card; canonical is ksound1). All six siblings share `DEF(TeamSay)` handler with integer arg 1-6.

### Proposed draft

```
Broadcasts team audio cue 4 (ktsound4.wav) to teammates with KT sounds enabled. See `ksound1` for the full ksound channel behavior. This command sends sound index 4 instead of 1.

Permission: any player (spectators excluded)

See also: ksound1 (canonical -- full behavior), ksound2, ksound3, ksound5, ksound6, kf (KF_KTSOUNDS bit)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:773)
- Reference card per canonical-card pattern (canonical is ksound1).

---

<!-- VERDICT: drafted -->
## ksound5 (KTX command, Player communication -- Shape 7 fan-out, reference card)

- **Status**: drafted
- **Source**: src/commands.c:774
- **Catalog line**: 13520
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 5 (ktsound5.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
>
> Set by: any player (in-game command).

### Shape classification

Shape 7 fan-out + canonical-card pattern (reference card; canonical is ksound1). All six siblings share `DEF(TeamSay)` handler with integer arg 1-6.

### Proposed draft

```
Broadcasts team audio cue 5 (ktsound5.wav) to teammates with KT sounds enabled. See `ksound1` for the full ksound channel behavior. This command sends sound index 5 instead of 1.

Permission: any player (spectators excluded)

See also: ksound1 (canonical -- full behavior), ksound2, ksound3, ksound4, ksound6, kf (KF_KTSOUNDS bit)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:774)
- Reference card per canonical-card pattern (canonical is ksound1).

---

<!-- VERDICT: drafted -->
## ksound6 (KTX command, Player communication -- Shape 7 fan-out, reference card)

- **Status**: drafted
- **Source**: src/commands.c:775
- **Catalog line**: 13547
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays team audio cue 6 (ktsound6.wav) for every teammate who has KT sounds enabled. Only available in team or CTF games.
>
> Set by: any player (in-game command).

### Shape classification

Shape 7 fan-out + canonical-card pattern (reference card; canonical is ksound1). All six siblings share `DEF(TeamSay)` handler with integer arg 1-6.

### Proposed draft

```
Broadcasts team audio cue 6 (ktsound6.wav) to teammates with KT sounds enabled. See `ksound1` for the full ksound channel behavior. This command sends sound index 6 instead of 1.

Permission: any player (spectators excluded)

See also: ksound1 (canonical -- full behavior), ksound2, ksound3, ksound4, ksound5, kf (KF_KTSOUNDS bit)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:775)
- Reference card per canonical-card pattern (canonical is ksound1).

---

## Shape-less prose-wrap message commands

<!-- VERDICT: drafted -->
## killer (KTX command, Player communication -- shape-less prose-wrap message)

- **Status**: drafted
- **Source**: src/commands.c:780
- **Catalog line**: 13384
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Opens a chat line pre-filled with the name of the player who last killed you, so you can send them a message. If your 'premsg' or 'postmsg' userinfo keys are set, they are inserted before and after the name. Prints "No name to display" if no killer is recorded.
>
> Default: n/a (command).
> Set by: any player via 'killer' command (usable outside a match).

### Shape classification

Shape-less (standalone prose-wrap message command). No cvar pairing, no sibling family with shared mechanism, no election/gate/side-channel role. The three message commands (killer, victim, newcomer) are each shape-less prose-wrap message commands -- they differ in the name source (killer name, victim name, newcomer name) and have no inter-entity relationship that maps to a catalog shape. They cross-link as an informal family via See-also.

### Proposed draft

```
Sends a chat message addressed to the player who last killed you, wrapping their name in your `premsg`/`postmsg` userinfo strings.

Effect:
  Looks up the name of the player who most recently fragged you (`self->killer`, stored at kill time).
  Searches all currently connected clients (players and spectators) for a matching netname.
  If found: stuffs `say [premsg ]<killername>[ postmsg]` to your client, opening the console with
    a pre-filled say line. You can edit or send the message before submitting.
  If not found (no kill recorded, or killer has disconnected): prints "No name to display".

Permission:    any player (spectators excluded)
Match-state:   any time (CF_MATCHLESS -- usable outside a match)

Example:
  setinfo premsg "nice shot"
  setinfo postmsg "!"
  bind INS killer
  After being fragged by "Ranger", pressing INS opens: say nice shot Ranger !

See also: victim (inverse -- messages your most recent frag), newcomer (messages last joined player),
  premsg (prefix userinfo key), postmsg (suffix userinfo key)
```

### Notes

- **CF flags**: `CF_PLAYER | CF_MATCHLESS` (registration row at src/commands.c:780)
- Verification: `SendKillerMsg()` at commands.c:1792 calls `SendMessage(self->killer)`. `self->killer` is set at client.c:5429 (`targ->killer = attackername`). SendMessage uses `find_client()` which iterates both `ctPlayer` and `ctSpec` entities -- the target lookup succeeds even if the killer is now spectating.
- Verification: The existing description says "Opens a chat line pre-filled" -- this is accurate; the stuffcmd mechanism doesn't send immediately, it pre-fills the console say line for the player to review/send.
- Verification: CF_MATCHLESS means usable outside a match (warmup, between matches). Confirmed.

---

<!-- VERDICT: drafted -->
## victim (KTX command, Player communication -- shape-less prose-wrap message)

- **Status**: drafted
- **Source**: src/commands.c:781
- **Catalog line**: 13857
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a say message to the player the caller most recently fragged, addressed by name. The message is optionally wrapped with the caller's "premsg" / "postmsg" userinfo strings as prefix and suffix. Does nothing if no matching connected client is found. Usable outside a match.
>
> Set by: any player (no arguments; see also: 'killer' command for the inverse).

### Shape classification

Shape-less (standalone prose-wrap message command). Inverse of `killer` (same SendMessage mechanism, different name source: `self->victim` instead of `self->killer`). No cvar pairing, no election, no gate.

### Proposed draft

```
Sends a chat message addressed to the player you most recently fragged, wrapping their name in your `premsg`/`postmsg` userinfo strings.

Effect:
  Looks up the name of the player you most recently fragged (`self->victim`, stored at kill time).
  Searches all currently connected clients (players and spectators) for a matching netname.
  If found: stuffs `say [premsg ]<victimname>[ postmsg]` to your client, opening the console with
    a pre-filled say line.
  If not found (no frag recorded, or victim has disconnected): prints "No name to display".

Permission:    any player (spectators excluded)
Match-state:   any time (CF_MATCHLESS -- usable outside a match)

Example:
  setinfo postmsg ", gg"
  bind HOME victim
  After fragging "Ranger", pressing HOME opens: say Ranger , gg
  (The comma in postmsg makes it read as "Ranger, gg" -- placement reveals the wrap structure.)

See also: killer (inverse -- messages who last killed you), newcomer (messages last joined player),
  premsg (prefix userinfo key), postmsg (suffix userinfo key)
```

### Notes

- **CF flags**: `CF_PLAYER | CF_MATCHLESS` (registration row at src/commands.c:781)
- Verification: `SendVictimMsg()` at commands.c:1797 calls `SendMessage(self->victim)`. `self->victim` is set at client.c:5428 (`attacker->victim = victimname`) -- stored on the attacker's entity, not the target's.
- Verification: Same SendMessage mechanism as killer -- find_client() matches both players and spectators by netname.
- The existing description says "Sends a say message" -- slightly misleading; it pre-fills the say line via stuffcmd, not auto-sends. Draft corrects to "stuffs ... opening the console with a pre-filled say line."

---

<!-- VERDICT: drafted_with_flag -->
## newcomer (KTX command, Player communication -- shape-less prose-wrap message)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:782
- **Catalog line**: 13635
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a chat message to the most recently joined player. The message text is taken from the caller's 'premsg'/'postmsg' userinfo wrapping.
>
> Set by: any player ('newcomer' in-game).

### Shape classification

Shape-less (standalone prose-wrap message command). Same SendMessage mechanism as killer/victim, but name source is the global `newcomer` pointer (last player to connect) rather than a per-player combat field. Separately classified from killer/victim because the name source mechanism differs (global state vs per-player kill fields).

### Proposed draft

```
Sends a chat message addressed to the most recently joined player, wrapping their name in your `premsg`/`postmsg` userinfo strings.

Effect:
  Looks up the netname of the most recently connected player (a global pointer updated each time a
  new player joins the server).
  Searches all currently connected clients (players and spectators) for a matching netname.
  If found: stuffs `say [premsg ]<newcomername>[ postmsg]` to your client, opening the console with
    a pre-filled say line.
  If not found (no player has joined yet, or the newcomer has disconnected): prints "No name to display".

Note: `newcomer` is available to spectators as well as players. This differs from `killer` and `victim`
  (which are player-only) because a welcome message to a new arrival is a server-announcement-style
  action that spectators may reasonably want to perform.

Permission:    any player or spectator (CF_BOTH | CF_MATCHLESS)
Match-state:   any time (CF_MATCHLESS -- usable outside a match)

Example:
  setinfo premsg "welcome,"
  setinfo postmsg "! type 'ready' when set."
  bind KP_0 newcomer
  When "Ranger" joins, pressing KP_0 opens: say welcome, Ranger ! type 'ready' when set.

See also: killer (messages your last killer), victim (messages your last frag),
  premsg (prefix userinfo key), postmsg (suffix userinfo key)
```

### Notes

- **CF flags**: `CF_BOTH | CF_MATCHLESS` (registration row at src/commands.c:782)
- **CF asymmetry note**: `newcomer` is `CF_BOTH` (players + spectators); `killer` and `victim` are `CF_PLAYER` (players only). Reason: `newcomer` is a server-announcement-style welcome command spectators also use; `killer` and `victim` reference per-player combat fields (`self->killer`, `self->victim`) that only exist in a player-entity context.
- Verification: `SendNewcomerMsg()` at commands.c:1802 calls `SendMessage(newcomer->netname)`. The global `newcomer` pointer is set at client.c:1685 (`newcomer = self`) inside `ClientConnect` -- updated on every new player connection. Spectator connections do not trigger this; `newcomer` always points to the most recent player slot connection.
- Verification: The existing description says "any player" in its Set by line -- this is incorrect; source is `CF_BOTH`, so spectators can also invoke `newcomer`. Draft corrects this.
- FLAG: The existing description says "Set by: any player" but source CF flags are `CF_BOTH | CF_MATCHLESS` (any player or spectator). Draft reflects source truth.

---

## Shape-less other commands

<!-- VERDICT: drafted -->
## tpmsg (KTX command, Player communication -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1052
- **Catalog line**: 13830
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends a predefined teamplay status message by name. Called with no argument (or an unrecognized name), prints the full list of available message names and their descriptions.
>
> Set by: any player via 'tpmsg <message-name>'.

### Shape classification

shape-less. Reasoning: `tpmsg` dispatches to a static named-message table (`messages[]` in teamplay.c:1645) via `TeamplayMessageByName`. Each message invokes a per-message function that constructs a team chat string (with powerup text and location name appended via `TeamplayBasicCommand` / `TeamplayMM2`) and routes it as a `say_team` message via `ClientSay(true)`. There is no cvar it toggles (Shape 1), no cycle (Shape 2), no vote (Shape 7), no bitmask toggle (Shape 11), no stateful userinfo pair (Shape 6). It is a standalone named-message dispatcher with built-in location/powerup augmentation. No inter-entity relationship to catalog.

### Proposed draft

```
Sends a predefined teamplay status message to your team by name, with your location and powerup status automatically appended.

Effect:
  Constructs a team-chat message from the named template, appends your current location name and any active powerup, then broadcasts it to your team as a say_team message.

  With no argument (or an unrecognized name), prints the list of available message names:
    yesok       yes/ok
    nocancel    no/cancel
    soon        item soon
    waiting     waiting
    slipped     enemy slipped
    replace     replace me
    trick       trick
    coming      coming
    getquad     get quad
    getpent     get pent
    quaddead    quad dead
    enemypwr    enemy powerup
    youtake     you take
    kill me     kill me
    lost        area lost
    secure      area secure
    help        area needs help
    need        report needs
    report      report status
    took        item taken
    point       player/item point

Permission:    any player (spectators excluded)
Default:       N/A (command)

Example:
  tpmsg need       ; send "report needs" with your location and powerup status to your team
  tpmsg coming     ; send "coming" with location to team

See also: report (broadcasts your weapon/health/armor status to teammates)
```

### Notes

- **CF flags**: `CF_PLAYER | CF_PARAMS | CF_MATCHLESS` (registration row at src/commands.c:1052)
- Verification: `TeamplayMessage` handler at teamplay.c:1687. `messages[]` array at teamplay.c:1645: 21 entries confirmed. `TeamplayBasicCommand` at teamplay.c:1432: appends powerup text + `LocationName(origin)` + calls `TeamplayMM2`. `TeamplayMM2` at teamplay.c:517: constructs `say_team "<k_nick|k> <text>"` and calls `ClientSay(true)`. If `k_nick` or `k` userinfo key is set, prefixes the message with that nick.
- Match-state: `CF_MATCHLESS` means it fires in any match state -- omitted per v2 convention.
- The `kill me` message name contains a space; invocation is `tpmsg kill me` (two tokens).

---

<!-- VERDICT: drafted -->
## report (KTX command, Player communication -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:746
- **Catalog line**: 13662
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Broadcasts a status report to every player on the caller's own team (including the caller and dead teammates awaiting respawn). Report includes armor type and value (or "a:0" if none), current health, active weapon and ammo count, and markers for held Ring of Shadows ("eyes"), Pentagram ("666"), and Quad ("quad").
>
> If a teamplay nickname is set (k_nick or k userinfo key), it prefixes the report instead of the player name.
>
> Default: n/a (command, not a cvar).
> Set by: any player.

### Shape classification

shape-less. Reasoning: `ReportMe` at commands.c:2562 is a pure state-printer -- reads caller's items, health, armor, weapon, ammo, powerup flags and sends formatted text to each teammate via `G_sprint`. No cvar write, no userinfo write, no vote, no paired command. Standalone state-broadcast; no inter-entity relationship to catalog.

### Proposed draft

```
Broadcasts your current weapon, ammo, health, and armor status to every player on your team.

Effect:
  Sends a status line to all teammates (including you and dead teammates).

  Report format:
    <name>: <armor-type>:<value>  h:<health>  <weapon>:<ammo>  [eyes] [666] [quad]

  Armor type is 'ga' (green), 'ya' (yellow), or 'ra' (red); shows 'a:0' if you have none.
  Weapon abbreviations: axe, sg, ssg, ng, sng, gl, rl, lg.
  Powerup markers appear only when held: 'eyes' (Ring of Shadows), '666' (Pentagram), 'quad' (Quad Damage).

  If you have set a teamplay nickname ('k_nick' or 'k' userinfo key), it replaces your player name in the report prefix.

Permission:    any player (spectators excluded)
Default:       N/A (command)

Example:
  report          ; sends "Paradoks: ya:150  h:100  rl:10  [quad]" to your team

See also: tpmsg (send a predefined teamplay status message to your team)
```

### Notes

- **CF flags**: `CF_PLAYER` (registration row at src/commands.c:746)
- Verification: `ReportMe` at commands.c:2562. Loop uses `find_plr` (players only, not spectators) filtered by `getteam(self)` match. Armor items bitmask items from `self->s.v.items`: bit 1=sg, bit 2=ssg, bit 4=ng, bit 8=sng, bit 16=gl, bit 32=rl, bit 64=lg (axe is the fallback). Powerup item bits: 524288=Ring of Shadows, 1048576=Pentagram, 4194304=Quad confirmed from commands.c:2647-2661.
- No match_in_progress guard in ReportMe -- command fires any time (any match state). Match-state omitted per v2 convention (any time is the default).
- `k_nick` is a userinfo key; `k` is also a userinfo key (short form). Both confirmed as `ezinfokey(self, "k_nick")` and `ezinfokey(self, "k")` reads at commands.c:2570-2576.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: F1 amendment final validation -- CF flag extraction

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: all 18 entities

**Observation**: The F1 amendment (mandatory CF flag extraction from registration rows into Permission lines, mapped via `references/universal-shape-v2.md` table) shipped its final validation in this batch. Pre-verified CF flag distribution from the Race-session source recon matched source for all 18 entities -- zero deviation from the pre-verified table. 5 silent corrections were caught in the existing descriptions: s-r / s-m / s-l (Permission was "any player" or "player command" but CF flags are `CF_BOTH`, spectators are also permitted); newcomer (Permission was "any player" but CF flags are `CF_BOTH | CF_MATCHLESS`). 4 of those 5 corrections were absorbed cleanly into the s-* family's Permission lines without separate FLAGs (the proposed draft already reflects source truth); newcomer carries an explicit FLAG because the CF_BOTH-vs-CF_PLAYER asymmetry vs killer/victim is itself worth surfacing.

**Source evidence**: src/commands.c:746 (report), :770-775 (ksound1-6), :780-782 (killer/victim/newcomer), :933-937 (s-*), :938-939 (mmode/multi), :1052 (tpmsg) -- registration rows.

**Recommendation**: F1 amendment is SHIPPING-READY. 28% catch rate (5/18) in this batch, within range of Race's ~34% (10/29) and Mode selection's earlier rates. Across the 3 post-F1-amendment batches (Internal state, Race, Player communication) the catch rate has been consistent and the amendment has prevented every silent Permission mislabel. No further amendment work needed; lock and shelve as a permanent SKILL fixture.

---

### F2: F3 (manual-flip Shape 1 amendment) dormancy confirmed

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: none (no cvars in this batch)

**Observation**: As expected per the handoff -- Player communication has zero cvars, so zero Shape 1 cvar+toggle pairs surfaced. No Shape 1 manual-flip variant detected. F3 has now been dormant across Internal state (no Shape 1 toggles in batch) and Player communication (no cvars at all in batch) -- the two batches following Gameplay rules where the amendment landed.

**Source evidence**: N/A -- absence-based finding.

**Recommendation**: Per the Internal state batch's deferral (HANDOVER.md line 39 (iv)) and the Race batch's confirmation, SHELVE F3 until MVDSV / QWFWD / QTV forks. The amendment text stays in `shape-catalog.md` for future fork use; no further KTX validation possible (KTX L1 catalog is now complete; manual-flip variants in MVDSV / QWFWD / QTV will validate the amendment in their own forks).

---

### F3: VERDICT-marker emission fully validated

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: all 18 entities (validation across both chunks)

**Observation**: The Race batch's recurring sub-agent compliance gap (3 of 5 sub-agents omitted `<!-- VERDICT: -->` markers, dispatcher recovered via Status-line-driven injection) DID NOT recur in this batch. Both sub-agents emitted all 9 markers immediately before each `## <entity>` header, with markers matching the `**Status**:` line and matching the YAML report's `verdict` field. The promoted Discipline 1 directive ("MUST emit VERDICT comment immediately before each `## <entity>` header" -- promoted from sub-bullet to PRIMARY discipline) is the validated fix.

**Source evidence**: `/tmp/chunk_A_2026-05-27.md` (9/9 markers); `/tmp/chunk_B_2026-05-27.md` (9/9 markers).

**Recommendation**: No apply-pass action. Lock the promoted-marker-directive wording as the standard chunk-prompt template for future codebase-fork dispatchers (MVDSV / QWFWD / QTV L1-batch-dispatchers).

---

### F4: Canonical-card pattern for ksound1-6 applied correctly

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: ksound1 (canonical), ksound2 / ksound3 / ksound4 / ksound5 / ksound6 (reference cards)

**Observation**: Per `references/shape-catalog.md` Shape 7 fan-out modifier + canonical-card pattern AND per `references/worked-examples.md` (which calls out ksound1-6 as a canonical pattern target): chunk B applied the discipline correctly. ksound1 carries the full v2 card (Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also with full content); ksound2-6 are short reference cards (Headliner + per-sibling delta of sound index 2-6 + See-also pointing at ksound1 canonical + sibling ksounds + kf). No 6-full-card violation; ~83% content consolidation rate vs hypothetical 6-full-card draft.

**Source evidence**: ksound1-6 all register `DEF(TeamSay)` at commands.c:770-775 with integer arg 1-6; the handler (commands.c:3377) is shared across all 6. Behavioral difference is filename only (`ktsound1.wav` through `ktsound6.wav`).

**Recommendation**: Apply-pass-author: apply ksound1 canonical card with full v2 content; apply ksound2-6 reference cards as-is. Cumulative canonical-card application across chunked-mode era: Demo & spectator 40 cards consolidated + Match flow 6 cards consolidated + Player communication 6 cards consolidated = 52 of 226 cards under canonical-card discipline (~23%).

---

### F5: Cross-batch See-also threading -- userinfo-pile unwalked (RULE-11 catch on handoff)

**Verdict**: ACTIONABLE

**Cards involved**: ksound1-6 (See-also -> `kf`); killer / victim / newcomer (See-also -> `premsg`, `postmsg`); report (Notes reference `k_nick`, `k`); tpmsg (Notes reference `k_nick`, `k`).

**Observation**: The handoff claimed `kf` was drafted in the Server config & network batch (2026-05-23) -- the dispatcher pre-flight grep across ALL 13 prior drafts files found `kf`, `premsg`, `postmsg`, `k_sdir`, `k_nick`, `k` are NOT present as section headers in any prior batch. The handoff's "kf is drafted with the bitmask documented" claim is RULE-11-WRONG -- it was a dispatcher hypothesis, not a contract. The 2026-05-23 drafts file covered Server config & network's k_* cvars + commands; userinfo keys (`kf`, `premsg`, `postmsg`, `k_sdir`, `k_nick`, `k`) appear to belong to the 14-entity unwalked pile flagged in the open-follow-ups list (633 - 595 cumulative pre-this-batch - 18 this batch = 20 unaccounted; minus 5 parks minus 1 aborted-to-synthesis = 14 remaining). The userinfo keys may all live in this gap.

**Source evidence**: Grep across `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md` for `^## (kf|premsg|postmsg|k_sdir|k_nick|k) ` returns zero matches.

**Recommendation**:
(a) Apply Player communication drafts as-is -- See-also references to `kf`, `premsg`, `postmsg`, `k_sdir`, `k_nick`, `k` resolve in the `entities` table regardless of whether those entities have been recast under v2. The apply pass writes new `entities.description` for Player communication entities; the See-also targets continue to exist as L1 entities with their pre-recast descriptions.
(b) Operator action: walk the 14-entity unwalked pile. Likely contents: `kf` (userinfo key), `premsg` / `postmsg` (userinfo keys), `k_sdir` (userinfo key, k_*-prefix false-positive trap per `entity-categories.md`), `k_nick` / `k` (userinfo keys), and ~8-9 other entities (could be additional userinfo keys, cmdline params, or category-not-walked items). Audit the catalog HTML index for any missed category buckets. The userinfo-key pile is a candidate batch on its own.
(c) When the userinfo-key batch ships, the apply-pass-author should add reverse See-also from those entities back to the Player communication entities that reference them (ksound1 family, killer/victim/newcomer family, mmode + s-* family for `k_nick` etc.).

---

### F6: Bidirectional See-also spot-check -- one defensible asymmetry

**Verdict**: CONFIRMED_CLEAN (with one acceptable asymmetry)

**Cards involved**: multi -> s-p; s-p -> (no multi)

**Observation**: Built the in-batch See-also adjacency graph and checked symmetry across 12+ sibling pairs (mmode<->s-p/s-r/s-m/s-l/s-t/multi; multi<->s-m/s-p; killer<->victim/newcomer; victim<->newcomer; tpmsg<->report; ksound1<->ksound2-6). All pairs symmetric EXCEPT: `multi` See-also includes `s-p` ("one-shot send to a specific player"); `s-p` See-also does NOT include `multi`. The asymmetry is defensible -- multi's See-also lists s-p as an alternative one-shot for the user already managing the multi set who might want to also send to individuals; s-p's See-also lists s-m (the multi-set send command) but omits `multi` (the multi-set manager) because the s-p user-flow ("how do I send to one player") is messaging-focused, not set-management-focused. Both directions reasonable on their own; symmetric repair not required.

**Source evidence**: Cross-card draft inspection.

**Recommendation**: No apply-pass action. Optional: apply-pass-author may add `multi` to s-p's See-also for symmetry if the See-also slot has room (s-p's current See-also has 5 entries -- mmode, s-l, s-r, s-t, s-m -- at the cap; adding multi would exceed the 4-5 cap rule).

---

### F7: Match-state surfacing minor inconsistency between chunks

**Verdict**: ACTIONABLE (apply-pass normalization)

**Cards involved**: mmode, multi (chunk A -- Match-state omitted, v2 standard); killer, victim, newcomer (chunk B -- Match-state explicit verbose "any time (CF_MATCHLESS -- usable outside a match)"); s-* family (chunk A -- Match-state CONDITIONAL: "During a live match, messages do not cross the player/spectator divide.")

**Observation**: Per `references/universal-shape-v2.md`: "Match-state: omit when 'any time' (most cvars, most one-shot player commands)". Chunk A omitted Match-state for any-time commands (mmode, multi, tpmsg, report -- all CF_MATCHLESS or any-time), following the v2 standard. Chunk B was verbose for killer/victim/newcomer ("any time (CF_MATCHLESS -- usable outside a match)") -- semantically identical but extra surfacing. The s-* family's Match-state is correctly populated (conditional behavior worth surfacing per v2 discipline). The chunk-B verbose form for any-time commands is a deviation from v2 standard.

**Source evidence**: All three chunk-B commands have `CF_MATCHLESS` registration flag -- semantically "any time."

**Recommendation**: Apply-pass-author: normalize killer / victim / newcomer Match-state by REMOVING the "any time (CF_MATCHLESS -- usable outside a match)" line (per v2 standard, any-time is the default and is omitted). The "usable outside a match" semantic can stay in the Permission line as a parenthetical if useful, or be cut entirely (the user's typical action plan doesn't care about match-state for prose-wrap message commands).

---

### F8: MMODE_RCON dispatch commented out in source (apply-pass operator decision)

**Verdict**: ACTIONABLE (operator decision)

**Cards involved**: mmode

**Observation**: mmode's handler at g_cmd.c:1092 accepts a `rcon` mode argument and writes `*mm = MMODE_RCON` if the caller passes the rcon password or has VIP_RCON rights. However, the ClientSay rcon dispatch branch at g_cmd.c:394 is currently COMMENTED OUT with a "WARNING: FULL ACCESS TO SERVER CONSOLE" comment. This means typing `mmode rcon <password>` succeeds in setting state (your *mm becomes MMODE_RCON, the rcon access gate passes), but the subsequent `say <command>` does NOT execute as a server rcon command -- the dispatch is gated to a no-op or logging-only path. The user's mental model ("I set mmode to rcon, so my next `say` runs as a server command") differs from observed behavior ("the next `say` does NOT run as a server command -- the dispatch is disabled in source"). The proposed mmode draft documents the access gate (rcon password / VIP_RCON requirement) but does NOT document the dispatch-disabled state.

**Source evidence**: g_cmd.c:394 (ClientSay rcon branch -- commented out); g_cmd.c:1216-1226 (mmode handler rcon access gate -- functional).

**Recommendation**: Apply-pass-author decision. Two options:
(a) Add a Prerequisites or Notes line to mmode: "Note: as of this build, `mmode rcon` sets state but subsequent `say` commands do NOT execute as rcon -- the dispatch is gated to a no-op in source. The state can be set but has no effect." This surfaces the surprise-bearing behavior at L1.
(b) Defer to L3 concept note (the "KTX private messaging system" concept note in F10 is a natural home). Keep L1 description focused on the documented intended behavior; the L3 note explains the rcon dispatch is currently disabled and links to the source comment.
Operator picks based on whether L1 should reflect "as-documented" vs "as-observed" semantics. Recommendation: (b) -- L1 documents the documented behavior; L3 captures the implementation residue.

---

### F9: TeamSay match-state absence (ksound1 canonical card)

**Verdict**: CONFIRMED_CLEAN (incorporated into draft)

**Cards involved**: ksound1 (canonical -- inherited by ksound2-6 via reference card pattern)

**Observation**: The existing description for ksound1 says "Only active in team or CTF games" -- correctly identifies the MODE prerequisite. Source check at commands.c:3377 confirms NO `match_in_progress` early-return; ksound also works in warmup if the mode is team or CTF. The canonical ksound1 draft incorporates this with "Match-state: any time (warmup and mid-match both work; mode prerequisite is the only gate)." The existing description omitted the warmup-applicability behavior; the draft adds it.

**Source evidence**: commands.c:3377 (TeamSay handler -- no match_in_progress guard).

**Recommendation**: No apply-pass action beyond applying the canonical draft as-is. The reference cards (ksound2-6) inherit the behavior via "See `ksound1` for the full ksound channel behavior."

---

### F10: Concept-note candidate -- KTX private messaging system

**Verdict**: ACTIONABLE (concept-note queue, not apply-pass)

**Cards involved**: mmode, multi, s-p, s-r, s-m, s-l, s-t (Shape 6 family, 7 entities)

**Observation**: The mmode + multi + s-* family is the densest sub-graph in this batch -- 7 entities with rich inter-relationships (stateful side <-> 5 one-shot siblings; mmode multi mode <-> multi command for set management; reply-chain mechanics via s_last_to / s_last_from with cross-references between s-p, s-l, s-r). L1 captures the per-entity behavior but the user navigating the family from one entity to another via See-also misses the overall architecture: "the mmode + multi + s-* family implements server-side private messaging routing; mmode is the stateful router; multi manages the multi-recipient bitmask; s-* commands are one-shot sends that bypass the router; reply-chain mechanics live in s_common." This is exactly the "subgraph with narrative" pattern that L3 concept notes are designed for.

**Source evidence**: Cross-card draft inspection of the 7-entity family.

**Recommendation**: Concept-note queue addition (not apply-pass). Title suggestion: "KTX private messaging system" or "KTX server-side message routing." Should cover: (a) the mmode -> ClientSay dispatch chain; (b) the multi-set lifecycle (multi command manages set; mmode multi activates routing; s-m fires one-shot to set); (c) the reply-chain mechanics (s_last_to / s_last_from updated by s_common; s-r / s-l navigation); (d) cross-batch references to `kf` / `premsg` / `postmsg` userinfo keys (which gate downstream behavior). Author when the userinfo-key pile is drafted (F5) so the concept note can cite finalized L1 entities. Estimated ~30-min author time per the asset-concept partner pattern.
