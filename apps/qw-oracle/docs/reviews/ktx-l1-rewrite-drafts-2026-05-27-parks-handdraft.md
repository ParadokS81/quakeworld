# ktx-l1-rewrite drafts -- batch 2026-05-27-parks-handdraft

Hand-authored v2 universal-shape (Layer A only, shape-less Layer B) recasts
for the 5 entities parked during the chunked-mode dispatch arc. Each was
parked because no cataloged Layer B shape captured its mechanism (triggers 1
no-shape-match and 4 sui-generis); operator accepted the parks at batch ship
time per the earn-their-keep discipline ("1-of-1 evidence doesn't earn a new
shape").

Parent terminal hand-drafted these directly (not via `ktx-l1-rewrite`, which
would re-park on the same trigger). Source citations verified at HEAD anchor
`1.47-2-g67253dc`. Apply-pass-author reviews and applies to
`entities.description` alongside the 14+2 batch drafts.

Park file references:
- `callalias` -> `ktx-l1-rewrite-parked-2026-05-23.md`
- `y` / `n` -> `ktx-l1-rewrite-parked-2026-05-26-admin-permissions.md`
- `roundsdown` / `roundsup` -> `ktx-l1-rewrite-parked-2026-05-26-mode-scoped-knobs.md`

Anchor: 1.47-2-g67253dc

---

## callalias (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:993 (registration); src/commands.c:8351-8410 (handler + check_callalias dispatcher); src/client.c:4333 (per-think dispatch hook)
- **Catalog line**: 16736
- **Anchor**: 1.47-2-g67253dc
- **Park rationale**: trigger 4 -- sui-generis mechanism (deferred client-side command dispatch via stuffcmd_flags with per-player timer); no cataloged shape matches

### Current description

> Schedules one of the caller's own client aliases to execute automatically after a delay. Usage: callalias <aliasname> <time>.
>
> Constraints: only usable within the first 15 seconds after connecting; delay must be 1-30 seconds; only one pending alias may be queued at a time (a second call before the first fires is rejected).
>
> Set by: any player.

### Shape classification

shape-less -- sui-generis deferred-dispatch mechanism. Server stores the alias name in `self->callalias` and arms a per-player timer (`self->callalias_time`); `check_callalias()` fires from `BothPostThink` every think cycle and, when the timer elapses, dispatches `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "%s\n", self->callalias)` to the requesting player only. No cataloged Layer B shape captures this pattern (no cvar toggle, no vote channel, no dispatch table, no userinfo state, no help printer).

The `STUFFCMD_IGNOREINDEMO` flag suppresses the deferred alias during demo playback -- a surprise-bearing constraint for players reviewing recorded demos.

### Proposed draft

```
Schedules one of the caller's own client-side aliases to execute automatically after a server-controlled delay. The server stores the alias name and fires it back to the requesting client via stuffcmd when the timer elapses.

Usage: callalias <aliasname> <time>
  aliasname  -- the name of a client-side alias the caller has defined
  time       -- delay in seconds before the alias fires (1-30 seconds)

Effect:
  Stores <aliasname> in a per-player slot.
  Arms a per-player timer for <time> seconds.
  When the timer elapses, the server stuffcmds the alias name to the requesting client,
  which then executes the local alias as if typed at the console.
  The alias is suppressed during demo playback (STUFFCMD_IGNOREINDEMO).

Prerequisites:
  Only usable within the first 15 seconds after connecting (post-connect window).
  Delay must be in the range 1-30 seconds (>30 or <=0 is refused).
  Alias name must be non-empty.
  Only one pending alias per player at a time -- a second call before the first fires is refused with "you can't install more than 1 alias before previous will execute".

Permission:    any player or admin spectator (CF_BOTH | CF_MATCHLESS | CF_PARAMS)
Match-state:   works during matches and in matchless mode (no match-progress gate)

Example:
  callalias say_team_ready 5    # 5 seconds after connect, fire the local "say_team_ready" alias

See also: (no peer entities -- mechanism is sui-generis in KTX)
```

### Notes

- Existing description says "Set by: any player" but the registration is `CF_BOTH | CF_MATCHLESS | CF_PARAMS`. CF_BOTH includes admin spectators. The v2 Permission line is "any player or admin spectator" (a 2nd-batch-style Permission correction per the F1 audit pattern).
- The STUFFCMD_IGNOREINDEMO surprise-bearing behavior is added to Effect (not in existing description).
- The 15-second post-connect gate is a hard refusal, not a warning -- v2 surfaces this in Prerequisites for parity with other batches' Prerequisites discipline.
- No See-also peers: the only KTX use of `strlcpy(self->X, ...)` followed by deferred `stuffcmd_flags` is this command. All other `stuffcmd_flags` call sites in commands.c are immediate dispatch. Empty See-also is correct per the per-card skill ("4-5 cap, order by strength; zero is fine if no genuine peers").

---

<!-- VERDICT: drafted -->

## y (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:796 (registration); src/admin.c:264 (YesKick handler); src/admin.c:28-40 (KickThink timeout); src/commands.c:794 (parent `kick` command)
- **Catalog line**: 1266
- **Anchor**: 1.47-2-g67253dc
- **Park rationale**: trigger 1 -- no-shape-match (relational kick-walkthrough session-response pattern; 1-of-1 in KTX, doesn't earn new shape)

### Current description

> Confirms the kick of the currently-prompted player or spectator during the interactive /kick walk-through. The /kick command (with no argument) enters a step-through mode; typing y at each prompt kicks that client and advances to the next. Does nothing outside an active kick session.
>
> Set by: admin command in-game (/y).

### Shape classification

shape-less -- kick-walkthrough session-response command. Gated on `self->k_kicking != 0` (per-admin session-state flag); on gate-pass, calls `DoKick(self->k_playertokick, self)` then `NextClient()` to advance the prompt. Pattern is parent-command-initiated per-admin session state + session-response commands -- no cataloged Layer B shape captures this.

The session is opened by the `kick` no-arg command (commands.c:794), which sets `self->k_kicking = g_globalvars.time` and prompts the first client. KickThink (admin.c:28) auto-expires the session after 60 seconds. `n` (DontKick, commands.c:797) is the paired skip-and-advance counterpart.

### Proposed draft

```
Confirms the kick of the currently-prompted client during an interactive kick-walkthrough session, then advances to the next client.

Effect:
  Kicks the currently-prompted player or spectator (via DoKick).
  Advances the walkthrough prompt to the next connected client.
  If no more clients remain, the walkthrough session ends.

Prerequisites:
  Caller must be in an active kick-walkthrough session (self->k_kicking != 0).
  Session is opened by the `kick` no-arg command and auto-expires after 60 seconds.
  Caller must still be an admin at execution time (re-checked each tick by KickThink).
  Outside an active session, the command is a silent no-op.

Permission:    admin only (CF_BOTH_ADMIN -- player or spectator with admin rights)
Match-state:   any state (admin command; not gated by match phase)

Example:
  kick           # opens the walkthrough; server prompts first client
  y              # confirms the kick of the prompted client + advances
  n              # would skip the prompted client without kicking

See also: kick (opens the walkthrough session this responds to), n (paired skip-and-advance counterpart)
```

### Notes

- Existing description is factually correct; v2 adds explicit Prerequisites + Permission details and surfaces the 60-second session timeout.
- Permission is `CF_BOTH_ADMIN = CF_PLR_ADMIN | CF_SPC_ADMIN` -- truly admin-only (the more restrictive variant; not the `CF_PLAYER | CF_SPC_ADMIN` "admin spectator or any player" pattern that confused prior batches).
- Pair with `n` is symmetric (same gate, same advance, different action). See-also is bidirectional with `n`.
- NOT the same as `yes` / `no` vote-response commands (commands.c:801-802, CF_PLAYER | CF_MATCHLESS, handlers VoteYes/VoteNo). The dispatcher brief at park time misclassified these; the park file documents the correction.
- The walkthrough mechanism (parent-command session-state + per-key responses) is a candidate "Shape N: multi-step wizard session" if MVDSV / unezQuake walk surfaces a sibling pattern. Until then, shape-less per earn-their-keep.

---

<!-- VERDICT: drafted -->

## n (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:797 (registration); src/admin.c:286 (DontKick handler); src/admin.c:28-40 (KickThink timeout); src/commands.c:794 (parent `kick` command)
- **Catalog line**: 1126
- **Anchor**: 1.47-2-g67253dc
- **Park rationale**: trigger 1 -- no-shape-match (relational kick-walkthrough session-response pattern; paired with `y`)

### Current description

> In the interactive admin kick walkthrough: declines kicking the currently prompted client and advances to the next one. Does nothing if not currently in kick mode. Counterpart to 'y' (confirm the kick).
>
> Set by: admin command 'n'.

### Shape classification

shape-less -- kick-walkthrough session-response command. Same mechanism family as `y`: gated on `self->k_kicking != 0`; on gate-pass, calls `NextClient()` without kicking. Paired skip-and-advance counterpart to `y`'s confirm-and-advance.

### Proposed draft

```
Skips the currently-prompted client during an interactive kick-walkthrough session and advances to the next one. Counterpart to `y` (which confirms the kick).

Effect:
  Advances the walkthrough prompt to the next connected client without kicking the current one.
  If no more clients remain, the walkthrough session ends.

Prerequisites:
  Caller must be in an active kick-walkthrough session (self->k_kicking != 0).
  Session is opened by the `kick` no-arg command and auto-expires after 60 seconds.
  Caller must still be an admin at execution time.
  Outside an active session, the command is a silent no-op.

Permission:    admin only (CF_BOTH_ADMIN -- player or spectator with admin rights)
Match-state:   any state (admin command; not gated by match phase)

Example:
  kick           # opens the walkthrough; server prompts first client
  n              # skip the prompted client without kicking + advance to next
  y              # confirms the kick of the prompted client

See also: kick (opens the walkthrough session this responds to), y (paired confirm-and-advance counterpart)
```

### Notes

- Existing description is factually correct; v2 adds explicit Prerequisites + Permission details.
- Permission is CF_BOTH_ADMIN (truly admin-only) -- same as `y`.
- NOT the same as the `no` vote-response command (commands.c:802, VoteNo handler). Same dispatcher misclassification noted in `y`'s notes.
- Paired with `y` per the kick-walkthrough mechanism; See-also is bidirectional.

---

<!-- VERDICT: drafted -->

## roundsdown (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1057 (registration); src/hoonymode.c:1239-1249 (HM_roundsdown handler); src/hoonymode.c:1122-1137 (HM_rounds_adjust shared helper)
- **Catalog line**: 13260
- **Anchor**: 1.47-2-g67253dc
- **Park rationale**: trigger 1 -- no-shape-match (two-command bounded increment/decrement pair on `k_hoonyrounds`; 1-of-1 in KTX, doesn't earn new shape)

### Current description

> HoonyMode admin command that decreases the round limit (k_hoonyrounds) by 2 rounds (minimum 2) and announces the new value to all players. Has no effect while a match is in progress; in non-HoonyMode games it tells the caller the command is unavailable.
>
> Set by: any player in a HoonyMode game (before match start).

### Shape classification

shape-less -- bounded-decrement command paired with `roundsup` (which increments). Both operate on the shared `k_hoonyrounds` cvar via `HM_rounds_adjust(change)`: reads current value with 0->6 fallback, computes `bound(2, current + change*2, 20)`, writes via `cvar_fset`, broadcasts the new value. No cataloged Layer B shape captures the bounded-increment/decrement pattern (Shape 2 cycles wrap; this pair has a hard bounded range with two directional commands).

### Proposed draft

```
Decreases the HoonyMode round limit by 2 rounds (minimum 2) and broadcasts the new value to all players. Paired with `roundsup` (which increments).

Effect:
  Reads the current k_hoonyrounds value (defaults to 6 if unset).
  Subtracts 2; clamps the result to the range [2, 20].
  Writes the new value back to k_hoonyrounds via cvar_fset.
  Broadcasts "Roundlimit set to N" to all players (or "roundlimit still N" if already at the minimum of 2).

Prerequisites:
  Must be in a HoonyMode mode (isHoonyModeAny() must return true).
  Match must not be in progress -- the adjustment is refused during a live match.
  Outside HoonyMode, the command prints "Command only available in hoonymode" to the caller.

Permission:    any player (CF_PLAYER -- spectators excluded)
Match-state:   pre-match only (refused if match in progress)

Example:
  roundsdown     # k_hoonyrounds drops from 8 to 6 (or stays at 2 if already minimum)

See also: roundsup (paired increment counterpart), k_hoonyrounds (the cvar being adjusted), hoonymode (the mode family this gates on)
```

### Notes

- **FLAG: Existing description calls this an "admin command" -- this is WRONG.** Source confirms `CF_PLAYER` registration (any player, spectators excluded). NOT admin-only. The v2 Permission line corrects this to "any player".
- The bounded range [2, 20] with step size 2 means even values only. The 0->6 default fallback applies when k_hoonyrounds is unset.
- The "roundlimit still N" message fires only at the minimum bound (clamped low); at the maximum (20), `roundsup` is the one that hits the clamp.
- Pair with `roundsup` is mechanically symmetric (same `HM_rounds_adjust` helper, opposite sign). See-also is bidirectional.
- The two-command bounded-adjust pattern is a candidate "Shape N: bounded directional pair" if MVDSV / unezQuake walks surface a sibling pattern (e.g. time/frags up/down). Until then, shape-less per earn-their-keep.

---

<!-- VERDICT: drafted_with_flag -- Permission line corrects existing "admin command" framing to "any player" -->

## roundsup (KTX command, Mode-scoped knobs -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1056 (registration); src/hoonymode.c:1227-1237 (HM_roundsup handler); src/hoonymode.c:1122-1137 (HM_rounds_adjust shared helper)
- **Catalog line**: 13287
- **Anchor**: 1.47-2-g67253dc
- **Park rationale**: trigger 1 -- no-shape-match (mirror of `roundsdown`)

### Current description

> HoonyMode admin command that increases the round limit (k_hoonyrounds) by 2 rounds (maximum 20) and announces the new value to all players. Has no effect while a match is in progress; in non-HoonyMode games it tells the caller the command is unavailable.
>
> Set by: any player in a HoonyMode game (before match start).

### Shape classification

shape-less -- bounded-increment command paired with `roundsdown` (which decrements). Same `HM_rounds_adjust(change)` mechanism with `change = +1`. Same shape analysis as `roundsdown`.

### Proposed draft

```
Increases the HoonyMode round limit by 2 rounds (maximum 20) and broadcasts the new value to all players. Paired with `roundsdown` (which decrements).

Effect:
  Reads the current k_hoonyrounds value (defaults to 6 if unset).
  Adds 2; clamps the result to the range [2, 20].
  Writes the new value back to k_hoonyrounds via cvar_fset.
  Broadcasts "Roundlimit set to N" to all players (or "roundlimit still N" if already at the maximum of 20).

Prerequisites:
  Must be in a HoonyMode mode (isHoonyModeAny() must return true).
  Match must not be in progress -- the adjustment is refused during a live match.
  Outside HoonyMode, the command prints "Command only available in hoonymode" to the caller.

Permission:    any player (CF_PLAYER -- spectators excluded)
Match-state:   pre-match only (refused if match in progress)

Example:
  roundsup       # k_hoonyrounds rises from 6 to 8 (or stays at 20 if already maximum)

See also: roundsdown (paired decrement counterpart), k_hoonyrounds (the cvar being adjusted), hoonymode (the mode family this gates on)
```

### Notes

- **FLAG: Existing description calls this an "admin command" -- this is WRONG.** Same correction as `roundsdown`. CF_PLAYER means any player; spectators are excluded but it is NOT admin-gated.
- Mirror of `roundsdown` mechanism (same helper, opposite sign). Pair See-also is bidirectional.
- Same candidate-shape future-work observation applies.

---

<!-- VERDICT: drafted_with_flag -- Permission line corrects existing "admin command" framing to "any player" -->

## Cross-card consistency notes

Hand-drafted batch -- 5 entities, 3 mechanism families (callalias sui-generis, y/n kick-walkthrough pair, roundsdown/roundsup bounded-adjust pair). Cross-card checks performed:

### F1: Permission-line correction propagates to both roundsdown + roundsup

**Verdict**: ACTIONABLE -- both drafts already corrected

**Cards involved**: roundsdown, roundsup

**Observation**: Existing descriptions for both commands frame these as "admin commands". Source registration is `CF_PLAYER` for both (commands.c:1056-1057). NOT admin-only. The "admin" framing is a documentation-side error inherited from the same source comment or upstream description; v2 Permission lines correct both consistently to "any player".

**Source evidence**: src/commands.c:1056-1057 (both rows show `CF_PLAYER`, not any admin flag).

**Recommendation**: Apply-pass-author applies the v2 Permission lines as-drafted. No further investigation needed.

---

### F2: y/n pair See-also bidirectionality + kick back-ref MISSING

**Verdict**: ACTIONABLE -- kick's draft See-also needs amendment

**Cards involved**: y, n, kick

**Observation**: y references n + kick; n references y + kick (these hand-drafts). But kick's drafted See-also in the 2026-05-26 Admin & permissions batch is `mkick (kicks multiple players by ID in one call), force_spec (moves players to spectator instead of disconnecting)` -- it does NOT include y or n. The Admin & permissions batch F7 cross-card finding flagged this as an apply-pass action ("ADD y/n to kick's See-also"); the apply pass has not yet run.

**Source evidence**: grep against `ktx-l1-rewrite-drafts-2026-05-26-admin-permissions.md` confirms kick's drafted See-also is exactly 2 entries (mkick + force_spec); y/n are absent.

**Recommendation**: Apply-pass-author hand-edits `kick`'s See-also line at apply time to add `y (confirms the kick of the prompted client + advances)` and `n (skips the prompted client without kicking + advances)`. kick's See-also already has 2 entries; adding 2 more puts it at the 4-entry limit (the per-card skill caps at 4-5). Pair-integrity triangle closes only after this amendment.

---

### F3: roundsdown/roundsup pair See-also bidirectionality + k_hoonyrounds + hoonymode targets

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: roundsdown, roundsup, k_hoonyrounds, hoonymode

**Observation**: roundsdown references roundsup + k_hoonyrounds + hoonymode; roundsup references roundsdown + k_hoonyrounds + hoonymode. Symmetric pair. k_hoonyrounds and hoonymode both verified in the L1 roster (drafted in prior batches).

**Source evidence**: roster check via grep against /tmp/ktx-l1-roster.txt (588 entries).

**Recommendation**: Apply-pass-author confirms k_hoonyrounds's drafted See-also references roundsdown + roundsup back (Mode-scoped knobs batch). If missing, add at apply time.

---

### F4: callalias has no See-also peers

**Verdict**: CONFIRMED_CLEAN (intentional empty)

**Cards involved**: callalias

**Observation**: callalias's mechanism (deferred client-side stuffcmd dispatch with per-player timer) is sui-generis in KTX. No peer entities to reference. Per the per-card skill discipline, empty See-also is acceptable when there are no genuine peers.

**Source evidence**: park file commentary at ktx-l1-rewrite-parked-2026-05-23.md ("No sibling found").

**Recommendation**: None -- empty See-also is correct.

---

## Summary

5 hand-drafts produced: **3 drafted_clean** (callalias, y, n) + **2 drafted_with_flag** (roundsdown, roundsup -- Permission-line corrections from "admin command" to "any player").

Apply pass writes these to `entities.description` alongside the 14+2 batch drafts. No additional cold-synth or recast dispatches needed for the parks pile.

Park pile is now drained:
- 5 of 5 parked entities have v2 universal-shape Layer A drafts (this file)
- 0 parked entities remain undrafted

Combined with the 627 drafted entries across 16 batch drafts files + the k_sready gapfill (drafted 2026-05-27), and the 4 d4-wiped recast-draft-already-existing entities (k_defmap / k_mode / k_spm_custom_model / k_timetop), the apply pass has drafts for all 633 KTX cvar+command entities.
