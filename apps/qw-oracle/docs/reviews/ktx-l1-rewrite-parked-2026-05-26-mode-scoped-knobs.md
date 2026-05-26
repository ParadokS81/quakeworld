# ktx-l1-rewrite parked entities -- batch 2026-05-26 (Mode-scoped knobs)

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of
batch.

Anchor: v1.36-1633-g67253dc. 2 entities parked from a 66-entity batch
(both trigger 1: no-shape-match -- two-command bounded increment/decrement
pair on k_hoonyrounds, no cataloged shape captures the pattern at 1-of-1
KTX evidence). Operator accepted the park; apply-pass-author hand-drafts
these as shape-less command-side levers for k_hoonyrounds. See the
`## Cross-card consistency notes` F16 in the drafts file for full context.

---

## roundsdown (KTX command, Mode-scoped knobs)

- **Source**: src/commands.c:1057
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 1 -- no-shape-match

### What the skill saw

- Registration: `{ "roundsdown", HM_roundsdown, 0, CF_PLAYER, CD_ROUNDSDOWN }` at `commands.c:1057`.
- Permission flag: `CF_PLAYER` only -- "any player (spectators excluded)". NOT admin-only.
- Handler (`hoonymode.c:1239-1249`): early-return if `!isHoonyModeAny()` (prints "Command only available in hoonymode"); early-return if `match_in_progress`; otherwise calls `HM_rounds_adjust(-1)`.
- `HM_rounds_adjust()` (`hoonymode.c:1122-1137`): reads current `k_hoonyrounds` (with 0→6 fallback via `HM_rounds()`), computes `new_rounds = bound(2, current + change*2, 20)`, writes back via `cvar_fset("k_hoonyrounds", new_rounds)`, broadcasts "Roundlimit set to N" or "roundlimit still N" if already at bound.
- Sibling `roundsup` (`commands.c:1056`, `hoonymode.c:1227-1237`): identical pattern with `+1` change direction.
- This is a **two-command up/down increment/decrement pair** on a shared cvar (`k_hoonyrounds`).

Shape candidates considered and ruled out:
- **Shape 1 (cvar+toggle binary flip)**: ruled out -- handler uses `cvar_fset`, not `cvar_toggle_msg`; result is not a 0↔1 flip.
- **Shape 2 (cvar+cycle command)**: ruled out -- Shape 2 requires a single command that increments+wraps. Here there are TWO separate directional commands (up and down) with a bounded range, not a circular wrap. The pair does not behave as a cycle.
- **Shape 3 (cvar-only)**: ruled out -- this IS a command, not a cvar.
- **All other shapes**: not applicable (not a vote, not a gating cvar, not a dispatcher, not a stateful+one-shot pair, not a bitmask toggle, not a help-printer).

The two-command bounded-increment/decrement pattern is not captured by any cataloged shape. The dispatcher instructions explicitly state to park this pair rather than force-fit.

### Suggested manual investigation

- Evaluate whether a new shape ("cvar + two-command increment/decrement pair") earns catalog entry. Earn-their-keep criterion: 2-3 confirmed KTX instances. Check whether other bounded up/down pairs exist elsewhere in KTX (e.g. time/frags adjust commands).
- If confirmed as a recurring pattern, the operator can crystallize a new Shape N covering: cvar with bounded range + two directional adjustment commands (up/down) + both announce new value to all players.
- The `roundsdown` card can be drafted manually as shape-less if operator prefers: Headliner = "Decreases the HoonyMode round limit (k_hoonyrounds) by 2, down to a minimum of 2." See-also -> k_hoonyrounds, roundsup, hoonymode.

---

## roundsup (KTX command, Mode-scoped knobs)

- **Source**: src/commands.c:1056
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 1 -- no-shape-match

### What the skill saw

- Registration: `{ "roundsup", HM_roundsup, 0, CF_PLAYER, CD_ROUNDSUP }` at `commands.c:1056`.
- Permission flag: `CF_PLAYER` only -- "any player (spectators excluded)". NOT admin-only.
- Handler (`hoonymode.c:1227-1237`): early-return if `!isHoonyModeAny()`; early-return if `match_in_progress`; otherwise calls `HM_rounds_adjust(+1)`.
- Mirror of `roundsdown` (which decrements). Same shape analysis applies.
- Two-command bounded-increment/decrement pair -- no cataloged shape matches.

Shape candidates considered and ruled out: same as `roundsdown` above. Both commands share the same mechanism; the park rationale is identical.

### Suggested manual investigation

- Same as `roundsdown` above. These two commands must be assessed together as a pair.
- If the operator drafts manually as shape-less: Headliner = "Increases the HoonyMode round limit (k_hoonyrounds) by 2, up to a maximum of 20." See-also -> k_hoonyrounds, roundsdown, hoonymode.
- Note: existing descriptions for both commands incorrectly call these "admin commands." Source confirms `CF_PLAYER` -- any player can invoke them (not admin-only). Any manual draft should correct this.