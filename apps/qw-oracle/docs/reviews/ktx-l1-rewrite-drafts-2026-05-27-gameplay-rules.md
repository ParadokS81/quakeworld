# ktx-l1-rewrite drafts -- batch 2026-05-27 (Gameplay rules)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher` for the **Gameplay rules** KTX category (69 entities,
8th chunked-mode batch). Apply-pass-author reviews each card, applies clean
drafts, hand-edits flagged-drafts after verifying the surfaced contradiction.
Drafts do NOT auto-apply to L1 (`entities.description`); the apply pass is a
separate phase.

**Batch summary**: 69 cards drafted; 0 parked; 0 novelty halts.
- 37 drafted (clean)
- 32 drafted_with_flag (localized factual contradictions surfaced)

**Anchor**: `v1.36-1633-g67253dc`
**Chunked-mode**: 7 chunks at `chunk_size=10` (6 chunks of 10 + 1 of 9 = 69).
**Sub-grouped below** by mechanism family (matches chunk-dispatch ordering).
**Cross-card consistency notes** at end of file.

---

# Sub-group: Powerup family (10)

The powerup system: master enable cvar (`k_pow`), per-type spawn-gate cvars (`k_pow_p`/`q`/`r`/`s`), pickup-rule cvar (`k_pow_pickup`), the multi-target lever `powerups` command, the paired-toggle `powerups_pickup` command, and config thresholds (`k_pow_check_time`, `k_pow_min_players`).

---

## k_pow (KTX cvar, Gameplay rules -- Shape 1 cvar side + Shape 3 composition)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:811
- **Catalog line**: 6567
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master switch for all powerups (quad, pent, ring, suit) on the server. Works with the per-type switches k_pow_q / k_pow_p / k_pow_r / k_pow_s: powerups are reported 'off' if this is 0 or all four per-type switches are 0, 'on' if all four per-type switches are 1, otherwise the enabled subset is listed. In matchless mode the server can auto-toggle powerups based on player count (see k_pow_min_players / k_pow_check_time).
>
> 0 = all powerups disabled (hidden and unclaimable).
> 1 = powerups enabled (subject to per-type switches).
>
> Default: 1.
> Set by: server config or 'pow' admin command in-game.

### Shape classification

Shape 1 cvar side (cvar+toggle pair with `powerups`) + Shape 3 composition (server-config threshold with matchless auto-toggle behavior).

The `powerups` command, when called with no arguments, calls `cvar_toggle_msg(self, "k_pow", ...)` and simultaneously propagates the toggled value to all four per-type cvars (k_pow_q/p/r/s). This is the Shape 1 relationship. The matchless auto-toggle behavior (driven by `k_pow_min_players` / `k_pow_check_time` via `Get_Powerups()`) is an additional read path that doesn't change the shape classification but is behaviorally significant.

### Proposed draft

```
Master switch controlling whether powerup items (Quad Damage, Pentagram, Ring of Shadows, Biosuit) are active on the server. Each per-type switch (k_pow_q / k_pow_p / k_pow_r / k_pow_s) further gates individual powerups — a powerup is available only when both this switch and its per-type switch are on.

0 = all powerups disabled (items hidden and unclaimable).
1 = powerups enabled (subject to the per-type switches).

Effect:
  The reported powerup state shown in match info is computed from this switch and the four per-type switches: "off" if this is 0 or all per-type switches are 0; "on" if all four per-type switches are 1; otherwise the enabled subset is listed as letters (e.g. "qr").
  In matchless (pickup-style) deathmatch, the server can override this switch automatically based on player count -- see k_pow_min_players and k_pow_check_time.

Permission:    server config, or in-game via 'powerups' (any player or admin spectator, pre-match only)
Default:       "" (0 -- powerups disabled at engine startup; typically set to 1 by the active mode config).

Example:
  # server.cfg
  k_pow 1
  k_pow_q 1
  k_pow_p 1
  k_pow_r 1
  k_pow_s 0    # disable suit only

See also: powerups (toggle command), k_pow_q (quad switch), k_pow_p (pent switch), k_pow_r (ring switch), k_pow_s (suit switch), k_pow_min_players (matchless auto-toggle threshold), k_pow_check_time (matchless check interval)
```

### Notes

- FLAG: wrong command name in existing description -- says "Set by: server config or 'pow' admin command in-game" but the command is `powerups`, not `pow`. Verified at commands.c:720: `{ "powerups", TogglePowerups, ... }`.
- FLAG: wrong default value -- existing description says "Default: 1" but source shows `RegisterCvar("k_pow")` (world.c:811), which calls `RegisterCvarEx("k_pow", "")` (world.c:751-753). The registered default is `""` (empty string = 0). The value is typically set to 1 by mode configs at server startup, but the engine-registered default is 0. Draft reflects the source-accurate default with a note explaining the typical practical outcome.
- Verification: `powerups` command (no-arg path) at commands.c:2803 calls `cvar_toggle_msg(self, "k_pow", ...)` then propagates to per-type cvars via `cvar_fset`. The command CF flags are `CF_PLAYER | CF_SPC_ADMIN` (commands.c:720) -- "any player or admin spectator". Match-state gate: `match_in_progress` early-return at commands.c:2782.
- See-also exceeds 5 entries due to the family structure; kept all family members as the cross-links are load-bearing for navigation.

---

## k_pow_check_time (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:817
- **Catalog line**: 6598
- **Anchor**: v1.36-1633-g67253dc

### Current description

> In matchless (pickup-style) deathmatch, the interval in seconds between checks of whether enough players are present to keep powerups enabled (governed by k_pow_min_players). Has no effect outside matchless mode or when k_pow_min_players is 0.
>
> Range: 0-999 (seconds). Value 0 uses the built-in default of 10 seconds.
>
> Default: 0 (effective 10 seconds).
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config). Registration at world.c:817 is `RegisterCvar("k_pow_check_time")` -- no `cvar_toggle_msg` site. Read only in `Get_Powerups()` at g_utils.c:1787-1789 (the matchless auto-toggle logic). Clamped to 0-999; 0 maps to built-in 10-second default at g_utils.c:1789.

### Proposed draft

```
In matchless (pickup-style) deathmatch, the interval in seconds between player-count checks that determine whether powerups stay enabled (see k_pow_min_players). Has no effect outside matchless mode or when k_pow_min_players is 0.

Range: 0-999 seconds. Setting 0 uses the built-in default of 10 seconds.

Permission:    server config only
Default:       0 (effective 10 s).

Example:
  # server.cfg -- check every 30 seconds with a 3-player minimum
  k_pow_min_players 3
  k_pow_check_time 30

See also: k_pow_min_players (player-count threshold that triggers auto-toggle), k_pow (master powerup switch)
```

### Notes

- Verification: `Get_Powerups()` at g_utils.c:1787-1789 reads and clamps this cvar. The 0-to-10 default substitution is confirmed at g_utils.c:1789: `k_pow_check_time = !k_pow_check_time ? 10 : k_pow_check_time;`. The early-return path at g_utils.c:1791 short-circuits when `!k_matchLess || !k_pow_min_players || !deathmatch`, confirming "no effect outside matchless mode or k_pow_min_players=0."
- No contradictions with existing description.

---

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

## k_pow_p (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:813
- **Catalog line**: 6658
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Per-type toggle for the Pentagram of Protection (invulnerability) powerup. When disabled, pentagram entities are hidden at spawn and cannot be picked up. Only takes effect when powerups are globally enabled (k_pow). Players never drop a held Pentagram on death regardless of this setting.
>
> 0 = Pentagram disabled (hidden and unpickable).
> 1 = Pentagram enabled (spawns and may be picked up).
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no dedicated paired toggle command). Registration at world.c:813: `RegisterCvarEx("k_pow_p", "1")`. The `powerups p` invocation triggers `cvar_toggle_msg(self, "k_pow_p", ...)` inside `TogglePowerups()` but `powerups` is a multi-target command shared by all four per-type cvars -- not a dedicated paired toggle for k_pow_p alone.

Canonical-card determination: k_pow_p/q/r/s are NOT canonical-card candidates despite similar structure. Key behavioral differences: k_pow_q and k_pow_r both gate death-drop paths (via the `dq` and `dr` cvars respectively); k_pow_p and k_pow_s gate only spawn-visibility and pickup. This is a meaningful behavioral difference -- "if any has a meaningful behavioral difference, separate full cards" per the canonical-card discipline.

### Proposed draft

```
Per-type switch for the Pentagram of Protection (invulnerability) powerup. When disabled, pent items are hidden at spawn and cannot be picked up. Requires k_pow (master powerup switch) to be on; if k_pow is 0, all powerups are off regardless of this setting. The Pentagram is never dropped on death regardless of this setting.

0 = Pentagram disabled (hidden and unpickable).
1 = Pentagram enabled (spawns and may be picked up).

Permission:    server config, or in-game via 'powerups p' (any player or admin spectator, pre-match only)
Default:       1.

Example:
  # server.cfg -- disable pentagram specifically
  k_pow 1
  k_pow_p 0

See also: k_pow (master powerup switch), powerups (toggle command -- 'powerups p' toggles this cvar in-game), k_pow_q (quad switch), k_pow_r (ring switch), k_pow_s (suit switch)
```

### Notes

- Verification: registration at world.c:813 `RegisterCvarEx("k_pow_p", "1")` confirms default 1. Hide/pickup logic at items.c:112 and 2037 checks `!cvar("k_pow_p")`. `DropPowerups()` at items.c:1972-1996 confirms no drop path for pent -- only quad (`dq` cvar path) and ring (`dr` cvar path) are dropped. `DropPowerup()` at items.c:1879 technically supports IT_INVULNERABILITY in the function, but `DropPowerups()` never calls it for pent. The "never dropped" claim is source-accurate.
- No contradictions with existing description.

---

## k_pow_pickup (KTX cvar, Gameplay rules -- Shape 1 cvar side)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:818
- **Catalog line**: 6689
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for "fair" powerup pickup -- prevents players from re-picking the same powerup while they still have it active, blocking timer stacking.
>
> 0 = a player can pick up the same powerup again while it is still active (timer stacks).
> 1 = re-picking an active powerup (quad, pentagram, ring, or suit) is blocked until it expires.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 1 cvar side (cvar+toggle pair). Registration at world.c:818: `RegisterCvarEx("k_pow_pickup", "0")`. Paired with `powerups_pickup` command, which calls `cvar_toggle_msg(self, "k_pow_pickup", ...)` at commands.c:2853. Read in `powerup_touch()` at items.c:2046 to gate the per-type re-pickup check.

### Proposed draft

```
Controls whether the "fair pickup" rule is enforced -- when enabled, a player cannot re-pick a powerup of the same type while they already have it active (blocking timer extension via re-pickup).

0 = re-picking an active powerup is allowed (timer extends).
1 = re-picking an active powerup of the same type is blocked until the current effect expires; quad, pentagram, ring of shadows, and biosuit each checked independently.

Permission:    server config, or in-game via 'powerups_pickup' (any player or admin spectator, pre-match only)
Default:       0.

Example:
  # server.cfg
  k_pow_pickup 1

See also: powerups_pickup (toggle command), k_pow (master powerup switch)
```

### Notes

- FLAG: both this cvar's existing description and the paired `powerups_pickup` command description use the phrase "cannot pick up multiple powerups at the same time" or similar. The actual mechanic (verified at items.c:2044-2071 + source comment "don't allow one to pickup powerup if he already has one of the same kind (ie 2 quads)") blocks re-picking the *same type* while it is active, NOT picking up different powerup types simultaneously. A player can hold quad + ring simultaneously; only a second quad while quad is still active is blocked. The existing description for this cvar says "re-picking an active powerup (quad, pentagram, ring, or suit) is blocked until it expires" which is actually correct -- the flag is on this cvar's card; the worse mislabel is on the paired command card (`powerups_pickup` says "cannot pick up multiple powerups at the same time").
- Verification: items.c:2046-2071 per-classname checks: each powerup type gated by its own `*_finished > g_globalvars.time` field. Default 0 confirmed by world.c:818 `RegisterCvarEx("k_pow_pickup", "0")`.
- "Set by: server config only" in existing description is outdated -- `powerups_pickup` command toggles it in-game. Draft reflects both paths.

---

## k_pow_q (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:812
- **Catalog line**: 6720
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Per-type switch for the Quad Damage powerup. When disabled, quad entities are hidden and cannot be picked up, and quad is never dropped on death. Requires k_pow (global powerup switch) to be on.
>
> 0 = quad disabled.
> 1 = quad enabled.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no dedicated paired toggle command; in-game toggling via `powerups q`). Registration at world.c:812: `RegisterCvarEx("k_pow_q", "1")`. Read at items.c:111/114 (spawn hide check), items.c:1974 (death-drop gate: `cvar("dq") && Get_Powerups() && cvar("k_pow_q")`), items.c:2039, and g_utils.c:1757.

Behavioral distinction from k_pow_p/s: k_pow_q gates both spawn-visibility/pickup AND the `dq` death-drop path. When k_pow_q=0, quad is hidden AND cannot be dropped on death even if `dq` is enabled. This asymmetry prevents a canonical-card pattern across the p/q/r/s family.

### Proposed draft

```
Per-type switch for the Quad Damage powerup. When disabled, quad items are hidden at spawn and cannot be picked up. Also suppresses quad drops on death -- the 'dq' drop-on-death cvar has no effect when this switch is off. Requires k_pow (master powerup switch) to be on.

0 = Quad Damage disabled (hidden, unpickable, never dropped on death even if 'dq' is enabled).
1 = Quad Damage enabled (spawns and may be picked up; 'dq' drop-on-death applies normally).

Permission:    server config, or in-game via 'powerups q' (any player or admin spectator, pre-match only)
Default:       1.

Example:
  # server.cfg -- disable quad specifically
  k_pow 1
  k_pow_q 0

See also: k_pow (master powerup switch), powerups (toggle command -- 'powerups q' toggles this cvar in-game), k_pow_p (pent switch), k_pow_r (ring switch), k_pow_s (suit switch)
```

### Notes

- Verification: items.c:1974 `if ((k_killquad || (cvar("dq") && Get_Powerups() && cvar("k_pow_q"))) && !k_berzerk)` -- k_pow_q is required for the dq drop path. When k_pow_q=0, the expression is false and quad is not dropped. Default 1 confirmed by world.c:812 `RegisterCvarEx("k_pow_q", "1")`.
- No contradictions with existing description.

---

## k_pow_r (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:814
- **Catalog line**: 6751
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables or disables the Ring of Shadows (invisibility) powerup. When disabled, ring items are hidden and cannot be picked up, and a held ring is not dropped on death. Only takes effect while powerups are globally enabled (k_pow).
>
> 0 = ring of shadows disabled.
> 1 = ring of shadows enabled.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no dedicated paired toggle command; in-game toggling via `powerups r`). Registration at world.c:814: `RegisterCvarEx("k_pow_r", "1")`. Read at items.c:111 (spawn hide check), items.c:1989 (death-drop gate: `cvar("dr") && Get_Powerups() && cvar("k_pow_r")`), items.c:2036. Also read in `Get_PowerupsStr()` at g_utils.c:1767.

Like k_pow_q, this gates both spawn-visibility/pickup AND a death-drop path (ring drop via `dr` cvar). This is a meaningful behavioral difference from k_pow_p and k_pow_s (which only gate spawn).

### Proposed draft

```
Per-type switch for the Ring of Shadows (invisibility) powerup. When disabled, ring items are hidden at spawn and cannot be picked up. Also suppresses ring drops on death -- the 'dr' drop-on-death cvar has no effect when this switch is off. Requires k_pow (master powerup switch) to be on.

0 = Ring of Shadows disabled (hidden, unpickable, never dropped on death even if 'dr' is enabled).
1 = Ring of Shadows enabled (spawns and may be picked up; 'dr' drop-on-death applies normally).

Permission:    server config, or in-game via 'powerups r' (any player or admin spectator, pre-match only)
Default:       1.

Example:
  # server.cfg -- disable ring specifically
  k_pow 1
  k_pow_r 0

See also: k_pow (master powerup switch), powerups (toggle command -- 'powerups r' toggles this cvar in-game), k_pow_q (quad switch), k_pow_p (pent switch), k_pow_s (suit switch)
```

### Notes

- Verification: items.c:1989 `if (cvar("dr") && Get_Powerups() && cvar("k_pow_r"))` -- k_pow_r gates the dr drop path. Default 1 confirmed by world.c:814 `RegisterCvarEx("k_pow_r", "1")`.
- No contradictions with existing description.

---

## k_pow_s (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:815
- **Catalog line**: 6782
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Per-type toggle for the Environmental Protection Suit (biosuit) powerup. Only applies while powerups are globally enabled (k_pow).
>
> 0 = suit is hidden and cannot be picked up.
> 1 = suit is available.
>
> Default: 1.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no dedicated paired toggle command; in-game toggling via `powerups s`). Registration at world.c:815: `RegisterCvarEx("k_pow_s", "1")`. Read at items.c:113 and 2038 (spawn hide/pickup checks). No death-drop path for suit: `DropPowerups()` at items.c:1972-1996 has no suit branch, and `DropPowerup()` at items.c:1879 explicitly lists only IT_QUAD, IT_INVISIBILITY, IT_INVULNERABILITY (pent) as supported -- IT_SUIT causes early return.

### Proposed draft

```
Per-type switch for the Environmental Protection Suit (biosuit) powerup. When disabled, suit items are hidden at spawn and cannot be picked up. The suit is never dropped on death regardless of this setting. Requires k_pow (master powerup switch) to be on.

0 = Biosuit disabled (hidden and unpickable).
1 = Biosuit enabled (spawns and may be picked up).

Permission:    server config, or in-game via 'powerups s' (any player or admin spectator, pre-match only)
Default:       1.

Example:
  # server.cfg -- disable suit specifically
  k_pow 1
  k_pow_s 0

See also: k_pow (master powerup switch), powerups (toggle command -- 'powerups s' toggles this cvar in-game), k_pow_q (quad switch), k_pow_p (pent switch), k_pow_r (ring switch)
```

### Notes

- Verification: items.c:113 and 2038 confirm hide/pickup gate. `DropPowerups()` at items.c:1972-1996 has no branch for the suit; `DropPowerup()` at items.c:1879 guards `(powerup != IT_QUAD) && (powerup != IT_INVISIBILITY) && (powerup != IT_INVULNERABILITY)` -- suit (IT_SUIT) triggers early return at line 1882. The suit is never dropped.
- No contradictions with existing description. The existing description is thin (no drop note, no explicit "never dropped" statement). Draft adds the "never dropped" note for parity with the other per-type cards.

---

## powerups (KTX command, Gameplay rules -- shape-less)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/commands.c:720
- **Catalog line**: 7467
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles powerup spawning on the current map. With no argument, toggles all four powerups together (Quad, Pentagram, Ring of Shadows, Biosuit). With one or more letter arguments, toggles each individually:
>
> q = Quad Damage, p = Pentagram of Protection, r = Ring of Shadows, s = Biosuit.
>
> The overall powerups-on state tracks whether at least one type is enabled. Has no effect during a live match. Powerups are reported disabled (no change) when Instagib or Midair mode is active.
>
> Set by: admin command 'powerups [q] [p] [r] [s]' in-game.

### Shape classification

shape-less. The `powerups` command is the multi-target lever for the powerup cvar family (k_pow, k_pow_q/p/r/s). It doesn't map to Shape 1 because it operates on five cvars rather than a single cvar. The Shape 1 tags live on the individual cvar cards; this command card is shape-less as the shared multi-target lever. Not Shape 2 (no cycle pattern). No other cataloged shape applies.

CF flags at commands.c:720: `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS` -- permission = "any player or admin spectator". Match-state: pre-match only (`match_in_progress` early-return at commands.c:2782). Mode guards: refused with broadcast when `k_instagib` or `k_midair` is active (commands.c:2787-2799).

### Proposed draft

```
Toggles powerup spawning for the current map -- either all types together or by individual type.

Effect:
  No argument: toggles k_pow (the master powerup switch) and propagates the new value to all four per-type switches (k_pow_q, k_pow_p, k_pow_r, k_pow_s) simultaneously.
  With letter arguments: toggles the named per-type switch(es) individually, then updates k_pow to reflect the aggregate (k_pow = 1 if at least one per-type is on; 0 if all are off). Up to four letters may be combined in a single invocation.
  Letters: q = Quad Damage, p = Pentagram, r = Ring of Shadows, s = Biosuit.

Prerequisites:
  Refused (with broadcast message) if Instagib or Midair mode is active.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  powerups         // toggle all powerups on or off
  powerups q r     // toggle quad and ring individually; k_pow updated automatically
  powerups p       // disable pentagram without affecting other types

See also: k_pow (master switch), k_pow_q (quad), k_pow_p (pent), k_pow_r (ring), k_pow_s (suit)
```

### Notes

- Verification: CF flags `CF_PLAYER | CF_SPC_ADMIN` at commands.c:720 -- "any player or admin spectator", NOT admin-only. F1 audit: existing description labels this an "admin command" but the CF flag does not support that. The v2 draft corrects to "any player or admin spectator."
- No-arg path at commands.c:2802-2809: `cvar_toggle_msg(self, "k_pow", ...)` then four `cvar_fset` calls propagating k_pow's new value to each per-type cvar. Arg-present path at commands.c:2812-2843: per-letter `cvar_toggle_msg` calls + aggregate `cvar_fset("k_pow", ...)` update.
- The "shape-less" classification is correct: this command's Layer B relationship is split across five cvar cards; the command is the shared lever with no single cvar pairing.
- The existing description's content is accurate (the "admin command" framing is the only issue, and it is a CF-flag wording issue, not a foundational framing error -- the behavior described is correct). No flag required beyond the existing description being outdated on the "admin" label, which the draft corrects.

---

## powerups_pickup (KTX command, Gameplay rules -- Shape 1 command side)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/commands.c:721
- **Catalog line**: 7498
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the no-multi-pickup powerup policy (k_pow_pickup) on or off and announces the new state. When enabled, a player cannot pick up multiple powerups at the same time. Has no effect while a match is in progress.
>
> Set by: admin command (before match start).

### Shape classification

Shape 1 command side (cvar+toggle pair with k_pow_pickup). Handler `TogglePuPickup()` at commands.c:2846-2854: `match_in_progress` early-return + `cvar_toggle_msg(self, "k_pow_pickup", ...)`. CF flags: `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS` -- "any player or admin spectator".

### Proposed draft

```
Toggles the fair-pickup rule (k_pow_pickup), which blocks re-picking the same powerup type while you already have it active.

Effect: flips k_pow_pickup between 0 and 1 and broadcasts the new state.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  powerups_pickup    // toggle fair-pickup rule on or off

See also: k_pow_pickup (state cvar), k_pow (master powerup switch)
```

### Notes

- FLAG: existing description says "a player cannot pick up multiple powerups at the same time" -- this is factually wrong. The actual mechanic (verified at items.c:2044-2071 with source comment "don't allow one to pickup powerup if he already has one of the same kind (ie 2 quads)") blocks re-picking the *same type* while it is already active. A player can hold quad + ring simultaneously; only picking a second quad while quad is still active is blocked. Each powerup type is checked independently via its own `*_finished` field. Draft corrects to "re-picking the same powerup type."
- Verification: CF flags `CF_PLAYER | CF_SPC_ADMIN` at commands.c:721 -- "any player or admin spectator", not admin-only. F1 audit: existing description says "admin command (before match start)" which incorrectly implies admin-only. Match-state: `match_in_progress` early-return at commands.c:2848 confirms pre-match only.
---

# Sub-group: Drop / quad / discharge (10)

Item-drop toggle pairs and the discharge rule. Five Shape 1 cvar+toggle pairs (`dp`+`droppack`, `dq`+`dropquad`, `dr`+`dropring`, `k_killquad`+`killquad`, `k_dis`+`discharge`). All entries are binary-flip Shape 1 with paired commands.

---

## dp (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:868
- **Catalog line**: 5916
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for whether dying players drop a backpack containing their ammo and current weapon during a live match.
>
> 0 = no backpack drop.
> 1 = backpack drops on death.
>
> Default: 1 (standard in competitive play -- dmm1, dmm3, dmm4 -- where backpack-from-corpse is a core mechanic; may be 0 on clan-arena / wipeout).
> Set by: server config or 'droppack' command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command). `dp` is registered via `RegisterCvar("dp")` at `world.c:868`; `droppack` at `commands.c:743` calls `ToggleDropPack` which is `cvar_toggle_msg(self, "dp", redtext("DropPacks"))` with a `match_in_progress` early-return. Binary 0/1 toggle; no mode-precondition.

### Proposed draft

```
Whether dying players drop a backpack containing their ammo and current weapon.

0 = backpack is lost on death.
1 = backpack drops on death (contains ammo and current weapon).

Drop is suppressed if: Bloodfest mode is active; the player suicided (outside yawn mode); the inventory is empty.

Permission:    server config or 'droppack' in-game (pre-match only)
Default:       1

Example:
  # server.cfg
  dp 1

  # toggle in warmup
  droppack

See also: droppack (paired toggle), k_frp (fair-pack distribution mode), dq (quad-drop rule), dr (ring-drop rule)
```

### Notes

- FLAG: `RegisterCvar("dp")` has no explicit default -- raw cvar default is 0 (empty string). The value 1 reflects the `common_um_init` preset applied by every KTX usermode (`dp 1` at commands.c:4190). "Default: 1" is accurate for any server running a standard mode preset but is technically the mode-preset value, not the engine cvar default. Apply-pass-author may annotate as "Default: 1 (set by mode presets)".
- Verification: three drop guards (bloodfest / suicide / empty-inventory) are source-confirmed at items.c:2674-2699.
- Permission wording corrected to standard form; existing description content was substantively correct.


---

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

## dr (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:867
- **Catalog line**: 5978
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for whether dying players drop their active ring of shadows during a live match.
>
> 0 = no ring drop on death.
> 1 = ring drops on death with its remaining duration preserved.
>
> Default: 0 (standard in competitive team play; may be 1 on FFA servers).
> Set by: server config or 'dropring' command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command). `dr` is registered via `RegisterCvar("dr")` at `world.c:867`; `dropring` at `commands.c:742` calls `ToggleDropRing` which is `cvar_toggle_msg(self, "dr", redtext("DropRing"))` with a `match_in_progress` early-return.

### Proposed draft

```
Whether a player carrying the Ring of Shadows drops it on death, preserving the remaining duration.

0 = ring is lost on death (not dropped).
1 = ring drops on death with remaining duration preserved.

Prerequisites: k_pow_r (ring powerup rule) and powerups enabled (k_pow) must both be on; otherwise the drop is silently skipped even when dr = 1.

Permission:    server config or 'dropring' in-game (pre-match only)
Default:       0

Example:
  # server.cfg
  dr 1
  k_pow_r 1   # ring powerup must also be on

  # toggle in warmup
  dropring

See also: dropring (paired toggle), dp (backpack-drop rule), dq (quad-drop rule), k_pow_r (ring powerup enable)
```

### Notes

- Prerequisites added: source-confirmed at items.c:1989 (`cvar("dr") && Get_Powerups() && cvar("k_pow_r")`). Present in the `dropring` command description but absent from this cvar card.
- Default 0 is consistent with `common_um_init` (`dr 0` at commands.c:4192).


---

## droppack (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:743
- **Catalog line**: 7093
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the dp (drop backpack) rule and broadcasts the new state to all players. Must be set before the match starts (refused while a match is in progress). When enabled, players drop a backpack containing their ammo and weapon on death during a live match (subject to standard guards: bloodfest disables it, suicides in non-yawn modes do not drop, empty inventory drops nothing).
>
> Set by: any in-game player or admin spectator ('droppack' command; warmup only).

### Shape classification

Shape 1 command side. Handler `ToggleDropPack` at commands.c:3165 uses `match_in_progress` early-return + `cvar_toggle_msg(self, "dp", redtext("DropPacks"))`. Registration at commands.c:743: `CF_PLAYER | CF_SPC_ADMIN`.

### Proposed draft

```
Toggles the backpack-drop rule (dp) and broadcasts the new state to all players.

Effect: flips dp between 0 and 1. When dp = 1, dying players drop a backpack containing their ammo and current weapon; drop is suppressed in Bloodfest mode, on suicide (outside yawn mode), or when inventory is empty.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  droppack

See also: dp (paired cvar storing the rule state), k_frp (fair-pack distribution mode), dq (quad-drop rule), dr (ring-drop rule)
```

### Notes

- No value enum on command card -- lives on the `dp` cvar card per Shape 1 discipline.
- Permission: existing description said "any in-game player or admin spectator" -- substantively correct. Standardized to "any player or admin spectator".
- Match-state consolidation: existing description mentioned "warmup only" in the Set-by prose; moved to the Match-state line per v2 convention (never duplicate in prose AND Match-state line).


---

## dropquad (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:741
- **Catalog line**: 7120
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the 'dq' setting, which controls whether players drop their Quad Damage on death during a live match. Each invocation flips dq between 0 and 1 and broadcasts the new state to all clients. The Quad drop also requires the mode's Quad powerup to be enabled (k_pow_q).
>
> 0 = Quad is lost on death (not dropped).
> 1 = Quad drops on death with remaining duration preserved.
>
> Default: depends on active mode preset.
> Set by: admin command 'dropquad' in-game (refused while a match is in progress).

### Shape classification

Shape 1 command side. Handler `ToggleDropQuad` at commands.c:3145 uses `match_in_progress` early-return + `cvar_toggle_msg(self, "dq", redtext("DropQuad"))`. Registration at commands.c:741: `CF_PLAYER | CF_SPC_ADMIN`.

### Proposed draft

```
Toggles the quad-drop rule (dq) and broadcasts the new state to all players.

Effect: flips dq between 0 and 1. When dq = 1, a player carrying Quad Damage drops it on death with remaining duration preserved; the drop requires k_pow_q (quad powerup) and powerups to be enabled.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dropquad

See also: dq (paired cvar storing the rule state and prerequisites), dp (backpack-drop rule), dr (ring-drop rule)
```

### Notes

- FLAG: Existing description places a 0/1 value enum and "Default: depends on active mode preset" on the command card. Value enum belongs on `dq` (the cvar card); "Default" is not a command attribute. Both removed per Shape 1 discipline.
- FLAG: "admin command 'dropquad'" is wrong. Registration is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, not admin-only. Corrected in draft.


---

## dropring (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:742
- **Catalog line**: 7151
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the `dr` rule on/off: when on, a player carrying the Ring of Shadows (invisibility) drops it on death and the remaining duration is preserved for pickup. Each invocation flips the rule and broadcasts the change to all players. Requires powerups enabled (`k_pow`) and the ring powerup rule enabled (`k_pow_r`) -- if either is off the Ring is lost on death regardless of `dr`. Only accepted before a match starts; refused silently during a live match.
>
> Set by: any in-game player; admin command for spectators ('dropring').

### Shape classification

Shape 1 command side. Handler `ToggleDropRing` at commands.c:3155 uses `match_in_progress` early-return + `cvar_toggle_msg(self, "dr", redtext("DropRing"))`. Registration at commands.c:742: `CF_PLAYER | CF_SPC_ADMIN`.

### Proposed draft

```
Toggles the ring-drop rule (dr) and broadcasts the new state to all players.

Effect: flips dr between 0 and 1. When dr = 1, a player carrying the Ring of Shadows drops it on death with remaining duration preserved; the drop requires k_pow_r (ring powerup) and powerups to be enabled.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dropring

See also: dr (paired cvar storing the rule state and prerequisites), dp (backpack-drop rule), dq (quad-drop rule)
```

### Notes

- FLAG: Existing description's Permission line "any in-game player; admin command for spectators" is non-standard and creates ambiguity. Registration is `CF_PLAYER | CF_SPC_ADMIN` mapping to "any player or admin spectator". The meaning is the same but the standard wording removes the implicit two-tier framing.
- Match-state consolidation: "Only accepted before a match starts; refused silently during a live match" moved to Match-state line per v2 convention.
- Prerequisites mention in Effect is sufficient for the command card; full details live on the `dr` cvar card.


---

## k_killquad (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:969
- **Catalog line**: 6352
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables KillQuad mode, replacing the standard Quad Damage spawn with a dropped quad that appears in play. The dropped quad expires after a short time if not picked up. Cannot be toggled during a live match.
>
> 0 = standard Quad Damage spawn rules.
> 1 = KillQuad mode active (no normal quad pickup; a dropped quad appears instead).
>
> Default: 0.
> Set by: server config or 'killquad' admin command in-game (not during a live match).

### Shape classification

Shape 1 (cvar + paired toggle command). `k_killquad` is registered via `RegisterCvarEx("k_killquad", "0")` at `world.c:969`; `killquad` at `commands.c:738` calls `cvar_toggle_msg(self, "k_killquad", redtext("KillQuad"))` with a `match_in_progress` early-return.

### Proposed draft

```
Controls KillQuad mode, which removes the normal Quad Damage pickup from the map and replaces it with a quad that only enters play when the current carrier dies.

0 = standard Quad Damage spawn rules.
1 = KillQuad mode: normal quad item removed at match start; when the quad-carrier dies, a dropped quad (10-second pickup window) spawns at their death position -- but only if no other player is currently holding quad and no quad item already exists in the level.

Permission:    server config or 'killquad' in-game (pre-match only)
Default:       0

Example:
  # server.cfg
  k_killquad 1

  # toggle in warmup
  killquad

See also: killquad (paired toggle), dq (standard quad-drop rule for quad carries), k_pow_q (quad powerup enable)
```

### Notes

- FLAG: Existing description says "a dropped quad appears in play" -- imprecise. Source shows: normal quad items are removed at match start (match.c:951-955); a dropped quad spawns only when the carrier dies AND NeedDropQuad() is true (no living player holds quad, no quad item exists). Corrected in draft.
- FLAG: "killquad admin command" is wrong. Registration is CF_PLAYER | CF_SPC_ADMIN (any player or admin spectator). Corrected in draft.
- Default 0 is source-verified via RegisterCvarEx("k_killquad", "0") at world.c:969.
- 10-second expiry confirmed at items.c:1894 (KillQuadThink removes the entity after 10 seconds).


---

## killquad (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:738
- **Catalog line**: 7384
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles KillQuad mode on or off and broadcasts the new state to all players. Ignored while a match is in progress.
>
> Default: n/a (command).
> Set by: player or spectator-admin command 'killquad' in-game (not during a live match).

### Shape classification

Shape 1 command side. Handler `killquad` at commands.c:3123 uses `match_in_progress` early-return + `cvar_toggle_msg(self, "k_killquad", redtext("KillQuad"))`. Registration at commands.c:738: `CF_PLAYER | CF_SPC_ADMIN`.

### Proposed draft

```
Toggles KillQuad mode (k_killquad) and broadcasts the new state to all players.

Effect: flips k_killquad between 0 and 1. When enabled, normal Quad Damage pickups are removed at match start; the quad instead only appears on the carrier's death.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  killquad

See also: k_killquad (paired cvar -- full KillQuad mode description), dq (standard quad-drop rule)
```

### Notes

- FLAG: Existing description includes "Default: n/a (command)" -- commands have no Default per v2 universal shape; section omitted. Minimal structural flag; no factual error in existing description.
- Permission: "player or spectator-admin command" in existing description is substantively correct; standardized to "any player or admin spectator" per CF_PLAYER | CF_SPC_ADMIN.


---

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

## discharge (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:723
- **Catalog line**: 7066
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles underwater weapon discharges (chain-reaction self-damage when firing a discharge weapon in water). Broadcasts the new state to all players. Has no effect while a match is in progress.
>
> Set by: admin command 'discharge' (flips the k_dis cvar).

### Shape classification

Shape 1 command side. Handler `ToggleDischarge` at commands.c:2856 uses `match_in_progress` early-return + `cvar_toggle_msg(self, "k_dis", redtext("discharges"))`. Registration at commands.c:723: `CF_PLAYER | CF_SPC_ADMIN`.

### Proposed draft

```
Toggles lightning-gun discharge (k_dis) between disabled (0) and enabled (1), and broadcasts the new state to all players.

Effect: flips k_dis between 0 and 1. When enabled (1), firing the LG while standing in water deals radius damage to all players in range; the shooter takes half damage. If k_dis is currently 2 (server-config-only value), this command sets it to 0 rather than 1.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  discharge

See also: k_dis (paired cvar -- full discharge description including value 2)
```

### Notes

- FLAG: "admin command 'discharge'" is wrong. Registration is CF_PLAYER | CF_SPC_ADMIN (any player or admin spectator). Corrected in draft.
- FLAG: "chain-reaction self-damage" framing is inaccurate. Source shows T_RadiusDamage(self, self, 35 * cells, world, dtLG_DIS) at weapons.c:1208 -- radius area damage centered on the shooter, affecting all players in range. Not a chain reaction; the shooter is attacker taking half-damage (combat.c:1191-1193). Corrected to "radius damage to all players in range; the shooter takes half damage."
- The binary-flip behavior when k_dis = 2 (sets to 0, not to 1) is surfaced in the Effect note; this is a surprise-bearing behavioral nuance for operators who set k_dis 2 in server config and then expect the in-game toggle to restore value 2.
---

# Sub-group: Spawn / item rules (10)

Spawn-point control, item-removal, and end-map triggers. Shape 1 pair `k_noitems`+`noitems`; Shape 2 cycle pairs `k_spawnicide`+`spawnicide`, `k_spw`-driven `spawn`, `k_spm_show`-driven `spawn_show`; Shape 3 config cvars (`k_end_tele_spawn`, `k_monster_spawn_time`, `k_remove_end_hurt`, `k_tp_tele_death`).

---

## k_end_tele_spawn (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:839
- **Catalog line**: 6228
- **Anchor**: v1.36-1633-g67253dc

### Current description

> On the map named "end" only: controls whether the teleporter-adjacent spawn point is kept active.
>
> 0 = tele spawn removed; players cannot spawn there.
> 1 = tele spawn kept active.
>
> Default: 0. Has no effect on any other map.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

Registration at `world.c:839` with no paired `cvar_toggle_msg` or cycle handler. Read sites: `world.c:588` (spawn point removal during map setup) and `bot_loadmap.c:364` (bot routing map setup). No command handler writes this cvar.

### Proposed draft

```
Controls whether the teleporter-adjacent spawn point on the "end" map is kept active or removed at map load.

0 = teleporter-adjacent spawn point removed; players cannot spawn there.
1 = teleporter-adjacent spawn point kept active.

Has no effect on any map other than "end".

Default:       0.
Permission:    server config only.

Example:
  # server.cfg -- keep the tele spawn on end active
  k_end_tele_spawn 1

See also: k_remove_end_hurt (removes hurt/changelevel triggers on the same map)
```

### Notes

- Verification: read sites at world.c:588 and bot_loadmap.c:364 confirm the map name guard ("end") and the spawn-removal logic. No paired command found. Shape 3 is clean.
- The bot load path at bot_loadmap.c:364 applies the same guard -- bots are also subject to this spawn-point configuration.

---

## k_monster_spawn_time (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1020
- **Catalog line**: 6414
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Base respawn delay in seconds before a killed monster reappears. Only applies in single-player/coop monster modes at skill 3 or higher.
>
> Range: 0 to 999999 (seconds, clamped). A value of 0 or below disables monster respawning. When positive, the actual delay is the base value plus a random bonus of up to half the base value.
>
> Default: 20.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

Registration at `world.c:1020` via `RegisterCvarEx("k_monster_spawn_time", "20")`. No paired toggle or cycle command. Read sites: `combat.c:285` (sets per-monster desired respawn time on death) and `sp_monsters.c:785` (skill gate: requires skill >= 3, returns early otherwise).

### Proposed draft

```
Base respawn delay (in seconds) before a killed monster reappears. Applies only in single-player / coop monster modes at skill 3 or higher.

Effect:
  - When positive, actual delay = base value + random bonus up to half the base value.
  - At 0 or below, monster respawning is disabled entirely.
  - Value is clamped to the range 0-999999.

Prerequisites: Monster mode (single-player/coop) at skill level 3 or higher; has no effect at lower skill levels.

Default:       20.
Permission:    server config only.

Example:
  # server.cfg -- 30-second base delay with up to 15s random bonus
  k_monster_spawn_time 30

  # server.cfg -- disable monster respawning
  k_monster_spawn_time 0
```

### Notes

- Verification: combat.c:285 shows `bound(0, cvar("k_monster_spawn_time"), 999999)` with the `resp_time * g_random() * 0.5` bonus calculation. sp_monsters.c:785 shows the `skill < 3 -> return` guard. Both match the existing description.
- The existing description is accurate; recast is mechanical v1 to v2 shape upgrade with Effect/Prerequisites slots added.

---

## k_remove_end_hurt (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:877
- **Catalog line**: 6813
- **Anchor**: v1.36-1633-g67253dc

### Current description

> On the "end" map only, controls removal of built-in level triggers.
>
> 0 = no modifications; hurt and changelevel triggers behave normally.
> 1 = remove both the hurt trigger and the changelevel trigger.
> 2 = remove only the hurt trigger (changelevel trigger kept).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

Registration at `world.c:877` with no paired toggle or cycle command. Two independent read sites: `triggers.c:978` (hurt trigger removal: `if (streq("end", mapname) && cvar("k_remove_end_hurt"))`) and `client.c:775` (changelevel trigger removal: same map guard + `cvar("k_remove_end_hurt") != 2` check gates the changelevel removal specifically).

### Proposed draft

```
On the "end" map only: controls removal of built-in hurt and changelevel triggers at map load.

0 = no modifications; both triggers behave normally.
1 = remove both the hurt trigger and the changelevel trigger.
2 = remove only the hurt trigger; changelevel trigger kept.

Has no effect on any map other than "end".

Default:       0.
Permission:    server config only.

Example:
  # server.cfg -- remove both triggers (keep players in the arena indefinitely)
  k_remove_end_hurt 1

  # server.cfg -- remove only the hurt trigger, allow changelevel to fire
  k_remove_end_hurt 2

See also: k_end_tele_spawn (controls teleporter-adjacent spawn point on the same map)
```

### Notes

- Verification: triggers.c:978 confirms hurt trigger removal at any non-zero value. client.c:775-776 confirms changelevel trigger removal only when `k_remove_end_hurt != 2`. This matches the existing 3-value enum exactly.
- The source comment at client.c:773 confirms the value=2 escape-hatch is intentional design.

---

## k_spawnicide (KTX cvar, Gameplay rules -- Shape 2)

- **Status**: drafted
- **Source**: src/world.c:857
- **Catalog line**: 6909
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls spawnicide -- instant-kill zones placed on spawn points and teleporter exits to deter spawn camping or blocking. Any non-bot player who lingers on a covered spot for more than ~1 second after spawning or teleporting is instantly killed.
>
> 0 = disabled.
> 1 = active during prewar (the pre-match warm-up phase).
> 2 = active during the live match.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 2 (cvar + paired cycle command).

Registration at `world.c:857` with no `cvar_toggle_msg` site; the `spawnicide` command (commands.c:2734) uses `cvar_set("k_spawnicide", ...)` after incrementing and wrapping at SPAWNICIDE_MATCH (2), cycling through 0 to 1 to 2 and back to 0. Classic Shape 2 cvar side.

### Proposed draft

```
Controls spawnicide -- instant-kill zones on spawn points and teleporter exits that deter spawn camping. Any non-bot player who lingers on a covered spot for more than ~1 second after spawning or teleporting is instantly killed.

0 = disabled.
1 = active during prewar (pre-match warm-up) only.
2 = active during the live match.

Default:       0.
Permission:    server config, or cycled in-game by 'spawnicide' (any player or admin spectator, pre-match only).
Match-state:   pre-match only (the 'spawnicide' cycle command has no effect mid-match).

Example:
  # server.cfg -- enable spawnicide for prewar warm-up only
  k_spawnicide 1

  # or cycle to the next mode in-game
  spawnicide

See also: spawnicide (cycle command), k_spm_show (controls spawn-point visibility -- toggling spawnicide resets and reapplies this display)
```

### Notes

- Verification: commands.c:2734-2773 shows `ToggleSpawnicide` reads `k_spawnicide`, increments, wraps at 2, writes back via `cvar_set`, calls `SpawnicideEnable()`/`SpawnicideDisable()` as appropriate. The handler also refreshes spawn-point display when `k_spm_show` is set (commands.c:2753).

---

## k_tp_tele_death (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:981
- **Catalog line**: 6976
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for whether team telefrags are penalized as teamkills. When enabled, telefragging a teammate costs the attacker 1 frag (logged as a suicide), matching the penalty for any other teamkill. When disabled, team telefrags carry no frag penalty.
>
> 0 = team telefrag not penalized.
> 1 = team telefrag costs attacker 1 frag.
>
> Default: 0.
> Set by: server config or 'teleteam' admin command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command).

Registration at `world.c:981` (RegisterCvar, default 0). The `teleteam` command (commands.c:7995) reads `k_tp_tele_death`, flips 0 to 1 or 1 to 0, writes back via `cvar_fset`, and broadcasts the result. Uses manual flip logic rather than `cvar_toggle_msg` but the behavioral pattern is identical to Shape 1 -- binary flip with broadcast. CF flags: `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator). Handler has `match_in_progress` early-return.

### Proposed draft

```
Whether team telefrags are penalized as teamkills in team play.

0 = team telefrag carries no frag penalty.
1 = team telefrag costs the attacker 1 frag (logged as a suicide), matching the penalty for any other teamkill.

Default:       0.
Permission:    server config, or 'teleteam' in-game (any player or admin spectator, pre-match only).
Match-state:   pre-match only.

Example:
  # server.cfg -- enable team telefrag penalty
  k_tp_tele_death 1

  # or toggle in-game before the match
  teleteam

See also: teleteam (toggle command)
```

### Notes

- FLAG: Existing description says "Set by: server config or 'teleteam' admin command in-game." The CF flag at commands.c:979 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only. Apply-pass-author should update any "admin command" framing for teleteam.
- Verification: client.c:5347 confirms the frag-deduction logic gates on `cvar("k_tp_tele_death")`. commands.c:7995-8013 confirms `teleteam` is the paired toggle using manual 0/1 flip + `cvar_fset`.

---

## k_noitems (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:787
- **Catalog line**: 6536
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes all weapon, ammo, health, armor, and powerup pickups from the map at match start. Players keep only their starting equipment. While active (and not in Race mode) the match settings readout shows "NoItems on".
>
> 0 = items present normally.
> 1 = all pickups removed at match start.
>
> Default: 0.
> Set by: server config or 'noitems' admin command (outside of match).

### Shape classification

Shape 1 (cvar + paired toggle command).

Registration at `world.c:787`. The `noitems` command (commands.c:8926) uses `cvar_toggle_msg(self, "k_noitems", redtext("noitems mode"))` with `match_in_progress` early-return. Classic Shape 1 signature. CF flags: `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator).

### Proposed draft

```
Whether all weapon, ammo, health, armor, and powerup pickups are removed from the map at match start. Players keep only their starting equipment.

0 = items present normally.
1 = all pickups removed at match start.

When active and not in Race mode, the match settings readout shows "NoItems on".

Default:       0.
Permission:    server config, or 'noitems' in-game (any player or admin spectator, pre-match only).
Match-state:   pre-match only.

Example:
  # server.cfg -- remove all items
  k_noitems 1

  # or toggle in-game before the match
  noitems

See also: noitems (toggle command)
```

### Notes

- FLAG: Existing description says "Set by: server config or 'noitems' admin command (outside of match)." CF flag at commands.c:1033 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only. Apply-pass-author should update "admin command" framing.
- Verification: commands.c:8926-8933 confirms `cvar_toggle_msg(self, "k_noitems", ...)` with `match_in_progress` guard. match.c:844 and match.c:1608 confirm item-removal and "NoItems on" readout behavior.

---

## noitems (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1033
- **Catalog line**: 7412
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles noitems mode on or off and announces the new state server-wide. Ignored while a match is in progress.
>
> Default: n/a (command).
> Set by: admin command 'noitems' in-game (not during a live match).

### Shape classification

Shape 1 (command side of cvar + paired toggle).

Registration at `commands.c:1033` with `CF_PLAYER | CF_SPC_ADMIN`. Handler at `commands.c:8926` uses `cvar_toggle_msg(self, "k_noitems", ...)` with `match_in_progress` early-return. Classic Shape 1 command side.

### Proposed draft

```
Toggles the noitems rule (k_noitems) on or off and announces the new state server-wide.

Permission:    any player or admin spectator.
Match-state:   pre-match only (silently ignored mid-match).

Example:
  noitems

See also: k_noitems (the rule state this toggles)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'noitems'." CF flag at commands.c:1033 is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, not admin-only.
- Shape 1 command side discipline: no value enum (lives on k_noitems card).

---

## spawn (KTX command, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:717
- **Catalog line**: 7609
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the respawn model through all available options and broadcasts the new setting. Has no effect while a match is in progress.
>
> -1 = pre-qtest nonrandom respawns.
> 0 = Normal QW respawns.
> 1 = KT SpawnSafety.
> 2 = Kombat Teams respawns.
> 3 = KTX respawns.
> 4 = KTX2 respawns.
>
> Default: n/a (command; sets k_spw, wraps from 4 back to -1).
> Set by: admin command 'spawn' in-game.

### Shape classification

Shape 2 (command side of cvar + paired cycle).

Registration at `commands.c:717` with `CF_PLAYER | CF_SPC_ADMIN`. Handler `ToggleRespawns` at `commands.c:2676` reads `k_spw`, increments (wraps: > 4 becomes -1), writes back via `cvar_fset("k_spw", k_spw)`, broadcasts via `G_bprint`. Cycles through -1, 0, 1, 2, 3, 4 in that order. Shape 2 command side.

Per Shape 2 discipline: value enum lives on the k_spw cvar card. This command card does not repeat the preset table.

### Proposed draft

```
Cycles the respawn model (k_spw) forward through all available options and broadcasts the new setting.

Cycle order: -1 -> 0 -> 1 -> 2 -> 3 -> 4 -> -1 (wraps).

See k_spw for the full preset descriptions and direct-set option.

Permission:    any player or admin spectator.
Match-state:   pre-match only (silently ignored mid-match).

Example:
  spawn

See also: k_spw (state cvar this cycles; can be set directly to skip cycling)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'spawn' in-game." CF flag at commands.c:717 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only.
- The existing description includes the value enum inline on the command card. Per Shape 2 discipline, the value enum belongs on the k_spw cvar card. This draft removes the enum from the command card and points to k_spw instead.
- Verification: commands.c:2676-2692 confirms the cycle logic and g_utils.c:2663-2688 confirms the respawn model names.

---

## spawn_show (KTX command, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:718
- **Catalog line**: 7675
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the spawn-point visibility mode (k_spm_show) forward and announces the new state. Has no effect while a match is in progress.
>
> 0 = off (spawn points hidden).
> 1 = prewar (spawn points shown only before the match starts).
> 2 = match (spawn points shown during the match).
> Advancing past 2 wraps back to 0.
>
> Default: n/a (command).
> Set by: admin command 'spawn_show' in-game.

### Shape classification

Shape 2 (command side of cvar + paired cycle).

Registration at `commands.c:718` with `CF_PLAYER | CF_SPC_ADMIN`. Handler `ToggleSpawnPoints` at `commands.c:2700` reads `k_spm_show`, increments, wraps at SPAWN_SHOW_MATCH (2), writes back via `cvar_set("k_spm_show", ...)`, and calls `ShowSpawnPoints()`/`HideSpawnPoints()` to apply the change immediately. Shape 2 command side.

### Proposed draft

```
Cycles the spawn-point visibility mode (k_spm_show) forward and applies the change immediately.

Cycle order: 0 (off) -> 1 (prewar) -> 2 (match) -> 0 (wraps).

See k_spm_show for the full value table and direct-set option.

Permission:    any player or admin spectator.
Match-state:   pre-match only (silently ignored mid-match).

Example:
  spawn_show

See also: k_spm_show (state cvar this cycles; can be set directly to skip cycling), spawnicide (linked -- toggling spawnicide resets and reapplies the spawn-point display)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'spawn_show' in-game." CF flag at commands.c:718 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only.
- Verification: commands.c:2700-2731 confirms the cycle logic and `ShowSpawnPoints()`/`HideSpawnPoints()` calls. commands.c:2753-2756 confirms the spawnicide/spawn_show display coupling.
- The value enum belongs on the k_spm_show cvar card per Shape 2 discipline; removed from this command card.

---

## spawnicide (KTX command, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:719
- **Catalog line**: 7644
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the spawnicide mode -- spawnicide kills a player who camps a spawn point so respawns are not blocked. Has no effect while a match is in progress. Cycles through:
>
> 0 = off.
> 1 = prewar (active during warm-up only).
> 2 = match (active during the live match). Advancing past match wraps back to off.
>
> Set by: admin command 'spawnicide'.

### Shape classification

Shape 2 (command side of cvar + paired cycle).

Registration at `commands.c:719` with `CF_PLAYER | CF_SPC_ADMIN`. Handler `ToggleSpawnicide` at `commands.c:2734` reads `k_spawnicide`, increments, wraps at SPAWNICIDE_MATCH (2), writes back via `cvar_set("k_spawnicide", ...)`, calls `SpawnicideEnable()`/`SpawnicideDisable()` accordingly. Shape 2 command side.

### Proposed draft

```
Cycles the spawnicide mode (k_spawnicide) forward and applies the change immediately.

Cycle order: 0 (off) -> 1 (prewar) -> 2 (match) -> 0 (wraps).

See k_spawnicide for full behavior description and direct-set option.

Permission:    any player or admin spectator.
Match-state:   pre-match only (silently ignored mid-match).

Example:
  spawnicide

See also: k_spawnicide (state cvar this cycles; can be set directly to skip cycling), spawn_show (linked -- toggling spawnicide resets and reapplies the spawn-point display)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'spawnicide'." CF flag at commands.c:719 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only.
- Verification: commands.c:2734-2773 confirms the cycle logic and `SpawnicideEnable()`/`SpawnicideDisable()` calls. commands.c:2753-2756 confirms the spawnicide/spawn_show display coupling.
- Shape 2 command side discipline: value enum lives on k_spawnicide cvar card, not here.

<!-- VERDICT: drafted -->
---

# Sub-group: Movement / jump rules (10)

Movement physics + jump-test gating. Shape 1 + Shape 4 composition for `k_disallow_kfjump`/`tkfjump` and `k_disallow_krjump`/`tkrjump` pairs; canonical Shape 1 `k_fallbunny`+`fallbunny`; standalone movement-toggle `airstep`; Shape 3 config cvars (`k_highspeed`, `k_no_fps_physics`, `add_q_aerowalk`).

---

## k_disallow_kfjump (KTX cvar, Gameplay rules -- Shape 1 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:799
- **Catalog line**: 6166
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether the kfjump trick (scripted forward rocket-jump: switch to RL, turn 180 degrees, fire) is permitted server-wide.
>
> 0 = kfjump allowed.
> 1 = kfjump disabled; invoking it prints "kfjump is disabled" and performs no jump.
>
> Default: 1.
> Set by: server config or admin command 'tkfjump'.

### Shape classification

Shape 1 (cvar+toggle) + Shape 4 (cvar gates kfjump impulse command)

`tkfjump` toggles this cvar via `trap_cvar_set_float(!cvar(cv_jt))` -- functionally identical to `cvar_toggle_msg` binary flip. The `kfjump` impulse-alias handler reads this cvar as a gate and refuses with a printed message when set to 1. Both relationship shapes apply: Shape 1 for the toggle pair (tkfjump), Shape 4 for the gate on the player-invokable jump action.

### Proposed draft

```
Controls whether the kfjump scripted rocket-jump is permitted on this server.

Effect:
  0 = kfjump allowed; players invoking the alias execute the forward rocket-jump.
  1 = kfjump disabled; attempting it prints "kfjump is disabled" with no action.

Permission:    server config, or 'tkfjump' admin command in-game (pre-match only)
Match-state:   pre-match only (tkfjump is blocked while a match is in progress)
Default:       1 (disabled by default).

Example:
  # server.cfg -- allow kfjump
  k_disallow_kfjump 0
  # or toggle in-game before match
  tkfjump

See also: tkfjump (admin toggle command), kfjump (player alias this gates)
```

### Notes

- Verification: `src/commands.c:831` confirms `tkfjump` is `CF_BOTH_ADMIN`; `src/commands.c:5010` confirms `kfjump()` handler reads `k_disallow_kfjump` as gate.
- `kfjump` is not a top-level command-table entry; it is a client-side alias pushed via `stuffcmd` (impulse 156 + `+jump;wait;-jump`). The gate check fires in the server-side impulse handler at `weapons.c:2777`.

---

## k_disallow_krjump (KTX cvar, Gameplay rules -- Shape 1 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:800
- **Catalog line**: 6197
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server-side toggle that disables the krjump command (a scripted vertical rocket-jump assist: switches to the rocket launcher, pitches straight down, and fires).
>
> 0 = krjump is allowed.
> 1 = krjump is disabled; attempting it prints "krjump is disabled".
>
> Default: 1.
> Set by: server config only.

### Shape classification

Shape 1 (cvar+toggle) + Shape 4 (cvar gates krjump impulse command)

Same shape pair as k_disallow_kfjump. `tkrjump` at `commands.c:832` toggles this cvar using the shared `t_jump` handler with `trap_cvar_set_float(!cvar(cv_jt))`. The `krjump()` handler at `commands.c:5035` reads this cvar as a gate.

### Proposed draft

```
Controls whether the krjump scripted rocket-jump is permitted on this server.

Effect:
  0 = krjump allowed; players invoking the alias execute the vertical rocket-jump.
  1 = krjump disabled; attempting it prints "krjump is disabled" with no action.

Permission:    server config, or 'tkrjump' admin command in-game (pre-match only)
Match-state:   pre-match only (tkrjump is blocked while a match is in progress)
Default:       1 (disabled by default).

Example:
  # server.cfg -- allow krjump
  k_disallow_krjump 0
  # or toggle in-game before match
  tkrjump

See also: tkrjump (admin toggle command), krjump (player alias this gates)
```

### Notes

- FLAG: Existing description says "Set by: server config only" -- this is factually wrong. `tkrjump` (commands.c:832, CF_BOTH_ADMIN) toggles this cvar via `trap_cvar_set_float`. Source: `t_jump` handler with j_type=2 builds `k_disallow_krjump` dynamically. The recast corrects this to match source truth.
- Verification: `src/commands.c:832`: `{ "tkrjump", DEF(t_jump), 2, CF_BOTH_ADMIN, CD_TKRJUMP }`; `src/commands.c:5035` confirms `krjump()` reads this cvar as gate.

---

## tkfjump (KTX command, Gameplay rules -- Shape 1 command side)

- **Status**: drafted
- **Source**: src/commands.c:831
- **Catalog line**: 7738
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles server permission for kfjump (scripted forward rocket-jump: switch to RL, turn 180, fire). Flips the k_disallow_kfjump cvar and broadcasts the result. Ignored while a match is in progress.
>
> Set by: admin command 'tkfjump'.

### Shape classification

Shape 1 command side (toggle paired with k_disallow_kfjump cvar)

Registered at `commands.c:831` as `{ "tkfjump", DEF(t_jump), 1, CF_BOTH_ADMIN, CD_TKFJUMP }`. The shared `t_jump` handler (j_type=1) builds `k_disallow_kfjump` via `va("k_disallow_k%cjump", 'f')`, flips it via `trap_cvar_set_float(!cvar(cv_jt))`, and broadcasts the enabled/disabled state. `CF_BOTH_ADMIN` = admin only.

### Proposed draft

```
Toggles the kfjump permission rule (k_disallow_kfjump) and broadcasts the result server-wide.

Effect: flips k_disallow_kfjump between 0 (allowed) and 1 (disabled); announces the new state to all players.

Permission:    admin only
Match-state:   pre-match only

Example:
  tkfjump
  # broadcasts: <adminname> enables kfjump
  # or:         <adminname> disables kfjump

See also: k_disallow_kfjump (cvar this toggles)
```

### Notes

- Verification: CF_BOTH_ADMIN at commands.c:831 = admin only (both player-slot and spectator admin).
- Value enum lives on k_disallow_kfjump card per Shape 1 discipline.

---

## tkrjump (KTX command, Gameplay rules -- Shape 1 command side)

- **Status**: drafted
- **Source**: src/commands.c:832
- **Catalog line**: 7765
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles server permission for krjump (the kill-rjump trick action). Flips the k_disallow_krjump cvar and broadcasts the result. Ignored while a match is in progress.
>
> Set by: admin command 'tkrjump'.

### Shape classification

Shape 1 command side (toggle paired with k_disallow_krjump cvar)

Parallel to `tkfjump`. Registered at `commands.c:832` with same `t_jump` handler, j_type=2 (builds `k_disallow_krjump` via `va("k_disallow_k%cjump", 'r')`). CF_BOTH_ADMIN = admin only.

### Proposed draft

```
Toggles the krjump permission rule (k_disallow_krjump) and broadcasts the result server-wide.

Effect: flips k_disallow_krjump between 0 (allowed) and 1 (disabled); announces the new state to all players.

Permission:    admin only
Match-state:   pre-match only

Example:
  tkrjump
  # broadcasts: <adminname> enables krjump
  # or:         <adminname> disables krjump

See also: k_disallow_krjump (cvar this toggles)
```

### Notes

- Verification: CF_BOTH_ADMIN at commands.c:832 confirmed.
- Value enum lives on k_disallow_krjump card per Shape 1 discipline.

---

## k_fallbunny (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:846
- **Catalog line**: 6259
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether a hard landing from a long fall triggers a "broken ankle" state that prevents the player from jumping until they land again, disrupting bunnyhopping after big drops.
>
> 0 = broken ankle on hard fall (voluntary jump suppressed until next landing).
> 1 = standard QuakeWorld landing behaviour (no broken-ankle penalty).
>
> Default: 0. Race mode and yawnmode always behave as 1 regardless of this setting.
> Set by: server config.

### Shape classification

Shape 1 (cvar+toggle)

`ToggleFallBunny` in `admin.c` calls `cvar_toggle_msg(self, "k_fallbunny", redtext("fallbunny"))` after `match_in_progress`, `isRACE()`, and `k_yawnmode` guards. Classic Shape 1 signature. Registered at `world.c:846`. `get_fallbunny()` at `g_utils.c:2726` returns `(k_yawnmode || isRACE() ? 1 : cvar("k_fallbunny"))` -- source-confirms the race/yawnmode override behaviour.

### Proposed draft

```
Controls whether hard landings after a long fall apply a "broken ankle" jump penalty.

Effect:
  0 = broken ankle applies; landing hard suppresses jumping until the next ground contact.
  1 = standard QuakeWorld physics; hard landings carry no movement penalty.

Prerequisites: Race mode and yawnmode always force value-1 behaviour regardless of this setting.
Permission:    server config, or 'fallbunny' command in-game (pre-match only)
Match-state:   pre-match only
Default:       0 (broken ankle enabled).

Example:
  # server.cfg -- disable the broken ankle penalty
  k_fallbunny 1
  # or toggle in-game before match
  fallbunny

See also: fallbunny (toggle command that flips this cvar)
```

### Notes

- Verification: `admin.c:909` confirms `cvar_toggle_msg(self, "k_fallbunny", redtext("fallbunny"))`. Refusal guards: `admin.c:890` (match_in_progress), `admin.c:895` (isRACE), `admin.c:902` (k_yawnmode).
- `g_utils.c:2726` confirms race/yawnmode override: `return (k_yawnmode || isRACE() ? 1 : cvar("k_fallbunny"))`.
- Canonical Shape 1 example from worked-examples.md. Pattern lifted directly.

---

## fallbunny (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:735
- **Catalog line**: 7210
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that toggles the fallbunny setting (k_fallbunny). Controls whether hard landings after a high fall apply the broken-ankle movement penalty to the player.
>
> 0 = broken-ankle penalty applies on hard landings after bunny-hopping.
> 1 = broken-ankle penalty suppressed; hard landings carry no movement consequence.
>
> Blocked during a live match and when race mode or yawnmode is active.
> Set by: admin command 'fallbunny' or server config (k_fallbunny).

### Shape classification

Shape 1 command side (toggle paired with k_fallbunny cvar)

Registered at `commands.c:735` as `CF_PLAYER | CF_SPC_ADMIN`. Handler `ToggleFallBunny` in `admin.c` calls `cvar_toggle_msg(self, "k_fallbunny", redtext("fallbunny"))` with `match_in_progress`, `isRACE()`, and `k_yawnmode` guards. Standard Shape 1 command side.

### Proposed draft

```
Toggles the broken-ankle landing penalty rule (k_fallbunny) and broadcasts the result.

Effect: flips k_fallbunny between 0 (penalty on) and 1 (penalty off); announces the new state to all players.

Prerequisites: blocked when race mode is active ("Command blocked because race mode is active") or yawnmode is active ("Command blocked because yawnmode is active").
Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  fallbunny

See also: k_fallbunny (cvar this toggles)
```

### Notes

- Verification: CF_PLAYER | CF_SPC_ADMIN at commands.c:735 = any player or admin spectator (not admin-only). Existing description says "Admin command" -- this is the documented CF flag mislabel for this flag combination. Corrected in the recast.
- Value enum (0/1 meanings) lives on k_fallbunny card per Shape 1 discipline.
- Refusal messages quoted verbatim from admin.c:897 and admin.c:904.

---

## airstep (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:999
- **Catalog line**: 7038
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the server's airstep movement physics on or off and broadcasts the new state to all players. Ignored while a match is in progress or in race mode.
>
> Default: n/a (command).
> Set by: admin command 'airstep' in-game (not during a live match or race).

### Shape classification

Shape 1 command side (toggle paired with pm_airstep engine cvar)

Registered at `commands.c:999` as `CF_PLAYER | CF_SPC_ADMIN`. Handler at `commands.c:8580` calls `cvar_toggle_msg(self, "pm_airstep", redtext("pm_airstep"))` after `match_in_progress || isRACE()` guard. The paired cvar is `pm_airstep` -- an engine/MVDSV cvar (not a KTX `k_*` cvar, not registered in `world.c`). Shape 1 pattern holds: the command is the toggle; the cvar is the state. `pm_airstep` may not have its own KTX L1 entity.

### Proposed draft

```
Toggles airstep movement physics (pm_airstep) on or off and broadcasts the new state.

Effect: flips pm_airstep between off and on; when on, players can change direction in mid-air as if on the ground. Announces the new state to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only (also blocked in race mode)

Example:
  airstep

See also: pm_airstep (engine cvar this toggles)
```

### Notes

- Verification: CF_PLAYER | CF_SPC_ADMIN at commands.c:999; `cvar_toggle_msg(self, "pm_airstep", ...)` at commands.c:8580; `match_in_progress || isRACE()` guard at commands.c:8574.
- `pm_airstep` is an engine cvar (not registered in KTX world.c). `match.c:1628` reads it for match-info display; `race.c:302` clears it on race mode init.
- Existing description says "admin command 'airstep'" -- the CF_PLAYER flag means any player or admin spectator can invoke it, not admin-only. Corrected in recast.

---

## k_highspeed (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:870
- **Catalog line**: 6322
- **Anchor**: v1.36-1633-g67253dc

### Current description

> The elevated max running speed that the 'speed' admin command switches to. The speed command toggles all players' max speed between the standard 320 and this value. Has no effect until the speed command is used.
>
> Range: 0-9999 (Quake speed units; clamped).
>
> Default: 320.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired toggle; read by another command as a parameter value)

No `cvar_toggle_msg` or `cvar_fset` paired command writes `k_highspeed`. The `speed` command (`commands.c:757`, CF_PLAYER) reads `k_highspeed` as the target high-speed value when toggling `sv_maxspeed` between 320 and `bound(0, cvar("k_highspeed"), 9999)` (`commands.c:3230`). `k_highspeed` is set once in server config; `speed` reads it as a parameter, not a toggle target. Pure Shape 3.

### Proposed draft

```
Sets the elevated maximum running speed that the 'speed' command switches to.

Effect: when 'speed' is toggled to high, sv_maxspeed is set to this value (clamped 0-9999). When toggled back, sv_maxspeed returns to 320. Setting this to 320 makes 'speed' a no-op (both states are equal).

Permission:    server config only
Default:       0 (empty; see FLAG below).

Example:
  # server.cfg -- set elevated speed to 400
  k_highspeed 400
  # any player can then toggle between 320 and 400 in-game:
  # speed

See also: speed (command that reads this value to toggle sv_maxspeed)
```

### Notes

- FLAG: Existing description claims "Default: 320" -- `RegisterCvar("k_highspeed")` at world.c:870 uses the bare form (no RegisterCvarEx with a value argument), which zero-initialises the cvar. The actual default is 0 (empty), not 320. The apply-pass-author should verify on a running server; if the engine treats empty as 0, running `speed` with k_highspeed unset will toggle to 0 (effectively disabling movement), not 320.
- `speed` is CF_PLAYER (any player, not admin-only) at commands.c:757. Existing description says "admin command" -- this is incorrect per source. Corrected: "any player can then toggle".
- k_maxspeed is a C global (`globals.c:33`): "used to store server maxspeed to allow switching by admins." Initialized from `sv_maxspeed` at world.c:1572.

---

## k_no_fps_physics (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:950
- **Catalog line**: 6505
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for framerate-independent jump height. When enabled, the jump-velocity multiplier is forced to 1 so all clients jump to the same height regardless of framerate. When disabled, jump height varies slightly with the client's frame time.
>
> 0 = framerate-dependent jump scaling active.
> 1 = jump height equalised across all framerates.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command; read by engine physics function)

No `cvar_toggle_msg` or toggle command paired with `k_no_fps_physics`. Read in `v_for_jump()` at `client.c:3582`: when set, returns 1.0 (forcing the multiplier to 1); when unset, returns a frame-time-dependent multiplier. Pure server-config-only shape.

### Proposed draft

```
Forces all clients to jump to the same height regardless of framerate.

Effect:
  0 = jump velocity scales with the client's frame time (slight height variance between clients at different framerates).
  1 = jump-velocity multiplier forced to 1; all clients jump to the same height.

Permission:    server config only
Default:       0.

Example:
  # server.cfg -- equalise jump heights across all framerates
  k_no_fps_physics 1

See also: (none -- standalone physics rule cvar)
```

### Notes

- Verification: `client.c:3582` confirms `if (cvar("k_no_fps_physics")) { return 1; }` in `v_for_jump()`; no toggle command found; `RegisterCvar("k_no_fps_physics")` at world.c:950 (zero-default).
- Existing description is accurate. Clean Shape 3 recast.

---

## add_q_aerowalk (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:945
- **Catalog line**: 5885
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spawns an extra Quad Damage at a fixed location on the map aerowalk during map setup.
>
> 0 = no extra Quad on aerowalk.
> 1 = extra Quad spawns on aerowalk.
>
> Default: 0 (code default; servers may set 1 in config). Has no effect on any other map.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command; map-setup conditional read)

No toggle command, no `cvar_toggle_msg`. Read once at map startup in `world.c:576`: `if (cvar("add_q_aerowalk") && streq("aerowalk", mapname))` spawns a Quad Damage entity at fixed coordinates (-912.6, -898.9, 248.0). Pure Shape 3; map-scoped conditional.

### Proposed draft

```
Spawns an extra Quad Damage at a fixed location on the aerowalk map during map setup.

Effect:
  0 = no extra Quad on aerowalk (standard item layout).
  1 = a Quad Damage spawns at coordinates (-912.6, -898.9, 248.0) on map load. Has no effect on any other map.

Permission:    server config only
Default:       0.

Example:
  # server.cfg -- enable extra Quad on aerowalk
  add_q_aerowalk 1

See also: (none -- map-specific item rule; no paired command)
```

### Notes

- Verification: `world.c:576` confirms the conditional spawn with `streq("aerowalk", mapname)` guard and literal coordinates `-912.6f, -898.9f, 248.0f`. `RegisterCvar("add_q_aerowalk")` at world.c:945.
- The `add_` prefix is imperative-sounding but this is unambiguously a cvar (RegisterCvar, not a command registration). No sui-generis concern; mechanism is a straightforward conditional item spawn on map init within Shape 3 territory.
- Existing description is accurate. Clean recast.
---

# Sub-group: CTF / nightmare / rule cvars (10)

CTF-mode commands (silent no-op outside CTF: `flagstatus`, `tossflag`, `tossrune`); cross-batch Shape 1 toggle `freeze` (pairs with `k_freeze` from Match flow); Shape 1 `k_nightmare_pu`+`coop_nm_pu` (name correction) and `k_bzk`+`bzk`; Shape 3 config cvars (`k_nightmare_pu_droprate`, `k_btime`, `k_classic_shotgun`, `k_short_gib`).

---

## flagstatus (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/ctf.c:591
- **Catalog line**: 7241
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the current state of both team flags to you. Each flag is reported as one of: in its base, carried by a named player, or dropped on the ground. Spectators see flags labelled RED and BLUE; players see the report relative to their own team (your flag / enemy flag). Has no effect outside CTF.
>
> Set by: any player or spectator.

### Shape classification

shape-less -- pure standalone state-printer. No cvar pairing, no sibling family, no election/gate/side-channel role. `isCTF()` guard in handler returns silently outside CTF (soft no-op, not a refuse-with-message shape pattern). Registration: `CF_BOTH | CF_MATCHLESS` (any player or spectator, any time). No inter-entity relationship to tag at Layer B.

### Proposed draft

```
Prints the current flag status for both teams (your flag and the enemy flag).

Effect:
  Each flag is reported as one of: at base, carried by a named player, or lying
  on the ground.
  Spectators see the report labeled RED and BLUE; players see it relative to their
  own team (your flag / enemy flag).
  Has no effect outside CTF -- returns silently with no output.

Permission:  any player or spectator
Match-state: any time

Example:
  flagstatus
  > Your flag is in base. The enemy flag is carried by PlayerX.
  (as spectator) flagstatus
  > The RED flag is lying about. The BLUE flag is in base.

See also: tossflag (toss the flag you are carrying), tossrune (toss held runes)
```

### Notes

- Verification: `FlagStatus()` in `src/ctf.c:591` confirmed. `isCTF()` guard at line 595 returns silently (no message printed) outside CTF. Spectator vs player path split at `self->ct == ctSpec` (line 608). Flag states FLAG_AT_BASE / FLAG_CARRIED / FLAG_DROPPED map to the three status strings.
- shape-less is correct: the `isCTF()` guard is a soft no-op (not refuse-with-message), so this is not Shape 1c. Pure read-only state-printer with no inter-entity relationship.
- Registration `CF_BOTH | CF_MATCHLESS` = any player or spectator, available any time including pre-match matchless mode.

---

## tossflag (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:915
- **Catalog line**: 7792
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF command that throws the flag the caller is carrying forward and upward (rather than simply dropping it at their feet). Does nothing if the caller is not holding a flag.
>
> Set by: any player carrying a flag.

### Shape classification

shape-less -- standalone one-shot command, no cvar pairing, no sibling family, no vote/gate/side-channel relationship. `PlayerDropFlag()` at `ctf.c:493` checks `!(player->ctf_flag & CTF_FLAG)` and returns silently if no flag held. No explicit `isCTF()` guard in `TossFlag` or `PlayerDropFlag` -- the condition is flag-holding state, not game mode. Registration: `CF_PLAYER | CF_MATCHLESS` (any player, any time). No inter-entity relationship to tag at Layer B.

### Proposed draft

```
Throws the flag you are carrying forward and upward, instead of dropping it at
your feet.

Effect:
  Launches the flag with forward and upward velocity based on your current view
  angle; the flag lands as a droppable item at the thrown location, pickable by
  any player.
  Does nothing if you are not carrying a flag -- the command is a silent no-op.

Permission:  any player (spectators excluded)
Match-state: any time

Example:
  tossflag    // while carrying the enemy flag, launches it ahead of you

See also: flagstatus (check which player has each flag), tossrune (toss held runes)
```

### Notes

- Verification: `TossFlag()` calls `PlayerDropFlag(self, true)` (`ctf.c:488-491`). `PlayerDropFlag` checks `!(player->ctf_flag & CTF_FLAG)` at line 498 and returns silently if no flag held. `tossed=true` triggers forward+upward velocity: `v_forward * 300 + v_up * 200` (lines 536-538) or `aim() * 300` + `velocity[2] = 200` (line 542-543) when pitch is zero.
- Existing "Set by: any player carrying a flag" is an action-context note rather than a CF flag description. CF registration is `CF_PLAYER | CF_MATCHLESS` -- any player. The carrying check is a soft no-op in the handler; recast uses "does nothing if you are not carrying a flag."

---

## tossrune (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:914
- **Catalog line**: 7819
- **Anchor**: v1.36-1633-g67253dc

### Current description

> CTF only. Throws all runes the caller is currently holding (resistance, strength, haste, regeneration). Each rune is tossed forward and upward and becomes pickable by others; there is a brief delay before the thrower can re-pick it. Does nothing if the caller holds no runes.
>
> Side effects: tossing haste restores normal max speed; tossing regeneration starts a regen-loss timer.
>
> Set by: any player ('tossrune').

### Shape classification

shape-less -- standalone one-shot command, no cvar pairing, no vote/gate/side-channel. `TossRune()` in `runes.c:179` has no explicit `isCTF()` guard; it iterates `ctf_flag` bits and is a silent no-op if none are set (which is the normal state outside CTF where runes don't exist). Registration: `CF_PLAYER | CF_MATCHLESS`. No inter-entity relationship to tag at Layer B.

### Proposed draft

```
Tosses all runes you are currently holding forward and upward, making them
pickable by other players.

Effect:
  Each held rune (resistance, strength, haste, regeneration) is thrown separately
  forward and upward from your position; each rune becomes pickable by others after
  a 0.75-second delay.
  Tossing the haste rune restores your speed to the server's base maximum (sv_maxspeed)
  immediately.
  Tossing the regeneration rune starts a regen-loss countdown that begins dropping
  your health after 5 seconds.
  Does nothing if you hold no runes.

Permission:  any player (spectators excluded)
Match-state: any time

Example:
  tossrune    // drops all held runes at once; useful to hand off runes to a teammate

See also: flagstatus (check flag state in CTF), tossflag (toss the flag you carry)
```

### Notes

- Verification: `TossRune()` at `runes.c:179-212` confirmed. Haste path sets `self->maxspeed = cvar("sv_maxspeed")` (line 197). Regen path spawns `RegenLostRot` think with `nextthink = g_globalvars.time + 5` (line 205), implementing the 5-second regen-loss countdown. Per-rune repick delay from `RuneResetOwner` think at `item->s.v.nextthink = g_globalvars.time + 0.75` (runes.c:145).
- Existing "CTF only" framing is accurate in practice (runes only exist in CTF), but the mode gating is implicit via rune-holding state -- not a mode-check guard. Recast uses "does nothing if you hold no runes" which is the actual source-enforced behavior.
- No FLAG needed -- the framing shift from "CTF only" to "no-op if no runes" is clarifying, not contradicting the mechanism.

---

## freeze (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:806
- **Catalog line**: 7268
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the map-freeze state and broadcasts the new setting. While frozen and no match is running, moving map entities (doors, platforms/lifts, trains) stay inert and do not activate. Has no effect during a live match.
>
> Default: off (k_freeze = 0).
> Set by: any player (or admin spectator) via 'freeze'.

### Shape classification

Shape 1 (cvar + paired toggle command). `ToggleFreeze()` at `commands.c:3797` calls `cvar_toggle_msg(self, "k_freeze", redtext("map freeze"))` with `match_in_progress` early-return at line 3799. No mode-precondition beyond match-state -- Shape 1 (not 1c). Registration: `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator. Cross-batch: `k_freeze` was drafted in the Match flow batch (2026-05-27); the apply-pass-author must add `freeze (toggle command)` to `k_freeze`'s See-also in that draft.

### Proposed draft

```
Toggles the map-freeze rule (k_freeze) and broadcasts the new setting.

Effect:
  Flips k_freeze between 0 (off) and 1 (on).
  While k_freeze is on and no match is running, moving map entities (doors,
  platforms/lifts, trains) stay inert -- they do not respond to player triggers.
  Has no effect during a live match; the command is blocked while match is in
  progress.

Permission:  any player or admin spectator
Match-state: pre-match only

Example:
  freeze    // toggles map freeze on; issue again to toggle off

See also: k_freeze (cvar storing the freeze state)
```

### Notes

- Verification: `ToggleFreeze()` at `commands.c:3797-3804` confirmed. `match_in_progress` early-return at line 3799. `cvar_toggle_msg(self, "k_freeze", redtext("map freeze"))` at line 3804. Registration: `CF_PLAYER | CF_SPC_ADMIN` at line 806.
- Cross-batch: `k_freeze` Match flow draft (2026-05-27) flagged that the `freeze` toggle command was missing from its See-also. Apply-pass-author must wire `freeze (toggle command)` into the `k_freeze` See-also when applying the Match flow drafts. The `freeze` card here cross-links back to `k_freeze`.
- Permission-line: `CF_PLAYER | CF_SPC_ADMIN` = "any player or admin spectator" (NOT admin-only). The existing description's parenthetical phrasing is correct in spirit; the recast uses the canonical CF-flag wording.
- Default framing: the Match flow F1 audit confirmed `RegisterCvar("k_freeze")` at `world.c:871` is a bare registration (default 0). The existing description's "Default: off (k_freeze = 0)" is correct.

---

## k_nightmare_pu (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:973
- **Catalog line**: 6444
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables Nightmare powerup drops: monsters killed at skill 3 or higher have a chance to drop a Quad, Pentagram, or Ring at their death location. Drop probability is set by k_nightmare_pu_droprate.
>
> 0 = disabled.
> 1 = enabled.
>
> Default: 0.
> Set by: server config or admin command 'nightmare_pu'.

### Shape classification

Shape 1 (cvar + paired toggle command). Toggle command is `coop_nm_pu` at `commands.c:1042` (`CF_PLAYER | CF_MATCHLESS`), calling `cvar_toggle_msg(self, "k_nightmare_pu", ...)` with `match_in_progress` early-return. The existing description names the command `nightmare_pu` -- source shows the registered command name is `coop_nm_pu`. This is a localized factual contradiction; verdict is `drafted_with_flag`.

Behavioral unpacking from `MonsterDropPowerups()` at `sp_monsters.c:641-686`: checks skill >= 3 (line 645), calls `Get_Powerups()` (line 650), then probability gate `g_random() > cvar("k_nightmare_pu_droprate")` (line 655). On pass, selects item via `i_rnd(0, 5)`: case 0 = invuln (k_pow_p required), case 1 = invis (k_pow_r required), default (cases 2-5) = quad (k_pow_q required). Each dropped via `DropPowerup(30, ...)` -- 30-second item lifetime.

### Proposed draft

```
Enables Nightmare powerup drops: when a monster is killed at skill 3 or higher,
it has a per-kill chance to drop a random powerup at its death location.

0 = powerup drops disabled.
1 = powerup drops enabled.

Effect:
  On each eligible monster kill, the server rolls against k_nightmare_pu_droprate.
  On a successful roll, one powerup is dropped: Quad Damage (most frequent, 4 in 6
  cases), Pentagram of Protection, or Ring of Shadows. Each dropped powerup stays
  for 30 seconds.
  Pentagram drops require k_pow_p to be enabled; Ring of Shadows drops require
  k_pow_r; Quad drops require k_pow_q. Powerup types disabled by their respective
  k_pow_* cvars are skipped silently.

Prerequisites:
  Skill must be set to 3 (Nightmare) or higher at map load for monster kills to
  qualify.

Permission:  server config or 'coop_nm_pu' in-game (pre-match only)
Default:     0

Example:
  // server.cfg
  set k_nightmare_pu 1
  set k_nightmare_pu_droprate 0.2
  // or toggle in-game (pre-match):
  coop_nm_pu

See also: k_nightmare_pu_droprate (per-kill drop probability), coop_nm_pu (toggle command)
```

### Notes

- FLAG: existing description names the toggle command as `nightmare_pu`. Source shows the registered command name is `coop_nm_pu` (`commands.c:1042`). Apply-pass-author must correct all references from `nightmare_pu` to `coop_nm_pu`.
- Verification: `MonsterDropPowerups()` at `sp_monsters.c:641-686` confirmed. Skill check at line 645. Probability gate at line 655. Item selection: `i_rnd(0, 5)` with cases 0=invuln, 1=invis, default (2-5)=quad -- giving quad 4/6 probability weight. `DropPowerup(30, ...)` confirms 30-second lifetime.
- `RegisterCvarEx("k_nightmare_pu", "0")` at `world.c:973` -- default 0 confirmed.
- The existing description omits the `k_pow_*` gate conditions (each powerup type requires its own `k_pow_*` cvar). Surfaced in Effect.

---

## k_nightmare_pu_droprate (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:974
- **Catalog line**: 6475
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Drop probability for powerups when a monster is killed in Nightmare powerup mode (k_nightmare_pu on, skill 3+). Higher values mean more frequent drops. Has no effect unless k_nightmare_pu is enabled.
>
> Range: 0.0 to 1.0.
>
> Default: 0.15.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config). `RegisterCvarEx("k_nightmare_pu_droprate", "0.15")` at `world.c:974`. No `cvar_toggle_msg` or `cvar_fset` site. Read only by `MonsterDropPowerups()` at `sp_monsters.c:655` in the gate `if (g_random() > cvar("k_nightmare_pu_droprate")) return`.

Behavioral unpacking: `g_random()` returns a value in [0.0, 1.0). The gate fires (powerup drops) when `g_random()` falls at or below `k_nightmare_pu_droprate`. So `0.0` = never drops; `1.0` = drops on every eligible kill; `0.15` (default) = approximately 15% drop rate (roughly 1 in 7 eligible kills).

### Proposed draft

```
Sets the per-kill drop probability for Nightmare powerup drops (k_nightmare_pu).

Range: 0.0 (never drops) to 1.0 (drops on every eligible kill).

Effect:
  On each monster kill that passes the skill 3+ check, the server compares a random
  value [0.0, 1.0) against this setting. A powerup drops only when the random value
  falls at or below k_nightmare_pu_droprate. At the default of 0.15, roughly 1 in 7
  eligible kills produces a drop.
  Has no effect when k_nightmare_pu is disabled.

Permission:  server config only
Default:     0.15

Example:
  // server.cfg
  set k_nightmare_pu 1
  set k_nightmare_pu_droprate 0.25    // ~25% drop rate per eligible kill

See also: k_nightmare_pu (enables the drop mechanic)
```

### Notes

- Verification: `sp_monsters.c:655` -- `if (g_random() > cvar("k_nightmare_pu_droprate")) return` -- probability semantics confirmed. Gate fires (drop happens) when random <= droprate.
- Behavioral unpacking adds the "1 in 7 kills" concrete framing absent from the existing description. The existing "higher values = more frequent" is directionally accurate but does not convey the probability mechanic.
- Default 0.15 confirmed via `RegisterCvarEx("k_nightmare_pu_droprate", "0.15")` at `world.c:974`.

---

## k_bzk (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:930
- **Catalog line**: 6070
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for berzerk mode. When enabled, the server arms a countdown at match start (set by k_btime). When that many seconds of match time remain, the server announces "BERZERK!!!!" and grants every player Quad and invulnerability for the rest of the match. Players who join mid-berzerk also receive Quad.
>
> 0 = berzerk mode off.
> 1 = berzerk mode on.
>
> Default: 0.
> Set by: server config or 'berzerk' admin command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command). `ToggleBerzerk()` at `commands.c:3242` calls `cvar_toggle_msg(self, "k_bzk", redtext("Berzerk mode"))` with `match_in_progress` early-return at line 3244. Registration: `berzerk` at `commands.c:956`, `CF_PLAYER | CF_SPC_ADMIN`. Bare `RegisterCvar("k_bzk")` at `world.c:930` = default 0.

Foundational source-verified fact: existing description says "grants every player Quad and invulnerability for the rest of the match." Source (`match.c:706-711`) shows: `super_damage_finished = g_globalvars.time + 3600` (Quad, permanent for match duration) and `invincible_finished = g_globalvars.time + 2` (invulnerability, 2-second kickoff burst only). The invulnerability is NOT persistent -- it is a brief 2-second event at the berzerk trigger moment. Localized factual contradiction -- FLAG.

### Proposed draft

```
Enables berzerk mode: when remaining match time drops to the k_btime threshold, all
living players receive permanent Quad Damage for the rest of the match.

0 = berzerk mode off.
1 = berzerk mode on.

Effect:
  At match start with k_bzk on, the server arms a countdown at k_btime seconds
  remaining.
  When triggered: broadcasts "BERZERK!!!!", grants every living player permanent
  Quad Damage for the match remainder, and applies a brief 2-second invulnerability
  burst at the trigger moment only.
  Players who connect while berzerk is already active also receive Quad Damage.
  Has no effect if k_btime is 0 -- berzerk fires only when k_btime is nonzero.

Permission:  server config or 'berzerk' in-game (pre-match only)
Default:     0

Example:
  // server.cfg
  set k_bzk 1
  set k_btime 120    // berzerk triggers when 2 minutes of match time remain

See also: k_btime (threshold in seconds remaining), berzerk (toggle command)
```

### Notes

- FLAG: existing description says "invulnerability for the rest of the match." Source (`match.c:710-711`) shows `invincible_finished = g_globalvars.time + 2` -- a 2-second invulnerability burst at the trigger moment, not persistent. Apply-pass-author must correct this claim.
- Verification: `ToggleBerzerk()` at `commands.c:3242-3249` confirmed. Berzerk trigger logic at `match.c:689-713` confirmed. Mid-match joiner Quad grant at `client.c:2394` confirmed. Bare `RegisterCvar("k_bzk")` at `world.c:930` = default 0.
- The existing description's "Quad" claim is accurate (`super_damage_finished = time + 3600` = permanent for match). Only the invulnerability duration is wrong.
- The existing description mentions "OctaPower in dmm4" -- source does not show a mode-conditional power-type switch in the berzerk trigger (`IT_QUAD` granted regardless of mode). This claim cannot be source-verified from the berzerk path; dropped from the recast. Apply-pass-author may investigate if there is a mode-conditional branch elsewhere that applies.

---

## k_btime (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:931
- **Catalog line**: 6040
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When k_bzk (berzerk mode) is enabled: the number of seconds of game time remaining at which the server triggers the berzerk event -- announcing "BERZERK!!!!" and granting every living player Quad Damage (OctaPower in dmm4) for the rest of the match, plus a brief 2-second invulnerability as a kickoff effect. Has no effect when k_bzk is off.
>
> Range: seconds of remaining match time (any positive value; 0 disables berzerk).
>
> Default: 0 (no default set; bare registration).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config). `RegisterCvar("k_btime")` at `world.c:931` -- bare registration (default 0). No `cvar_toggle_msg` or cycle site. Read at `match.c:1269` (`k_berzerktime = cvar("k_btime")`) at match start when `k_bzk` is set; also displayed in the rules printout at `commands.c:3338`. The "0 disables berzerk trigger" claim is source-verified: the countdown check at `match.c:690` (`if (k_berzerktime != 0)`) skips the berzerk logic when `k_btime` is 0.

### Proposed draft

```
Sets the match-time threshold (in seconds remaining) at which berzerk mode fires,
when k_bzk is enabled.

Effect:
  At match start with k_bzk on, the server snapshots k_btime into an internal
  countdown. When remaining match time reaches this value, the berzerk event fires:
  "BERZERK!!!!" broadcast, permanent Quad Damage for all living players, and a
  brief 2-second invulnerability burst at that moment.
  Set to 0 to suppress the berzerk trigger even with k_bzk on.
  Has no effect when k_bzk is off.

Permission:  server config only
Default:     0

Example:
  // server.cfg
  set k_bzk 1
  set k_btime 120    // berzerk fires when 2 minutes remain in the match

See also: k_bzk (enables/disables berzerk mode)
```

### Notes

- Verification: `k_berzerktime = cvar("k_btime")` at `match.c:1269`, inside `if (cvar("k_bzk"))` block. Countdown guard at line 690 (`if (k_berzerktime != 0)`) -- confirmed that k_btime=0 suppresses the trigger. `RegisterCvar("k_btime")` at `world.c:931` = bare registration, default 0.
- The existing description's 2-second invulnerability framing is source-verified accurate. Retained.
- The existing "OctaPower in dmm4" claim: same source-verification gap as k_bzk above -- the berzerk trigger path grants `IT_QUAD` regardless of mode; no mode-conditional branch found. Dropped. Apply-pass-author may investigate.
- Shape 3 is correct -- no toggle command exists for `k_btime`.

---

## k_classic_shotgun (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:948
- **Catalog line**: 6101
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether the shotgun and super-shotgun show per-pellet or combined impact effects.
>
> 0 = one combined impact effect for the whole spread.
> 1 = each pellet shows its own blood or gunshot impact at its precise hit point (classic visuals).
>
> Damage dealt is identical either way; this changes only the visual feedback of the spread.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config). `RegisterCvarEx("k_classic_shotgun", "1")` at `world.c:948`. No `cvar_toggle_msg` or cycle site. Read by `FireBullets()` at `weapons.c:549` and `W_FireShotgun()` at `weapons.c:740`. Both paths call `Multi_Finish()` when `classic_shotgun=0` (lines 724, 793), which merges the spread into a single combined damage/visual event. With `classic_shotgun=1`, each pellet's `TraceAttack(..., true)` generates its own impact decal individually.

### Proposed draft

```
Controls whether shotgun and super-shotgun shots show a separate impact effect at
each pellet's hit point, or a single combined effect for the whole spread.

0 = one combined impact effect for the full spread.
1 = each pellet shows its own impact at its precise hit point (classic visuals).

Effect:
  Affects visual feedback only -- damage dealt is identical in both modes.
  At 1 (default), each pellet produces its own blood or bullet-puff decal at its
  individual impact location, matching original Quake shotgun behavior.
  At 0, the pellet impacts are merged into a single combined feedback event.

Permission:  server config only
Default:     1

Example:
  // server.cfg
  set k_classic_shotgun 0    // merged impact mode; cleaner feedback on dense spreads
```

### Notes

- Verification: `weapons.c:549` -- `qbool classic_shotgun = cvar("k_classic_shotgun")` in `FireBullets()`. `TraceAttack(4, direction, classic_shotgun)` at line 717 (SSG), `TraceAttack(1, dir, classic_shotgun)` at line 782 (SG). `if (!classic_shotgun) Multi_Finish()` at lines 724 and 793 -- damage combination path confirmed. `ApplyMultiDamage()` called in both paths -- damage-equivalence confirmed.
- Default=1 confirmed via `RegisterCvarEx("k_classic_shotgun", "1")` at `world.c:948`.
- Existing description is accurate and well-framed. Recast is a template lift (v1 shape to v2 structure). See-also omitted -- no paired commands or closely-related sibling cvars with a meaningful cross-link to add.

---

## k_short_gib (KTX cvar, Gameplay rules -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:942
- **Catalog line**: 6845
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls how long gib corpse pieces persist before removal.
>
> 0 = each gib removed after a random delay of 10 to 20 seconds.
> 1 = each gib removed 2 seconds after it is thrown.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config). `RegisterCvar("k_short_gib")` at `world.c:942` -- bare registration (default 0). No `cvar_toggle_msg` or cycle site. Read only by `ThrowGib()` in `player.c:1048`: `int k_short_gib = cvar("k_short_gib")` sets the timeout at line 1063 as `g_globalvars.time + (k_short_gib ? 2 : (10 + g_random() * 10))`. Timings source-verified exactly as the existing description states: 2s (short) vs 10-20s random (default).

### Proposed draft

```
Sets how long gib corpse pieces stay on the ground before the server removes them.

0 = each gib persists for a random 10 to 20 seconds.
1 = each gib is removed 2 seconds after it lands.

Effect:
  Each thrown gib has its own independent removal timer; pieces from the same
  death are not removed in sync.
  Shorter lifetimes reduce visual clutter in high-fragging games.

Permission:  server config only
Default:     0

Example:
  // server.cfg
  set k_short_gib 1    // quick cleanup; gibs gone in 2 seconds
```

### Notes

- Verification: `player.c:1063` -- `newent->s.v.nextthink = g_globalvars.time + (k_short_gib ? 2 : (10 + g_random() * 10))`. Exact timing values confirmed. `RegisterCvar("k_short_gib")` at `world.c:942` = bare registration, default 0 confirmed.
- Existing description is accurate and source-verified clean. Recast is a template lift. Added "independent timer per gib" observation from `ThrowGib`'s per-spawn structure. See-also omitted -- no paired commands or related sibling cvars.
---

# Sub-group: Weapons / gates / handicap (10)

Visible-weapons composition (`k_allow_vwep` master gate + `k_vwep` state + `vwep` toggle); Shape 2 cycle cvars `k_spw`/`k_frp`/`k_socd` with paired commands (`spawn`/`fairpacks`/`socd`); Shape 4b `giveme` (cheat-gated); Shape 4 `handicap` gated by `k_lock_hdp`.

---

## k_vwep (KTX cvar, Gameplay rules -- Shape 1 + Shape 4 composition)

- **Status**: drafted
- **Source**: src/world.c:875
- **Catalog line**: 7007
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the visible-weapons (vwep) extension -- other players see the model of the weapon you are currently holding. Takes effect only when k_allow_vwep is also enabled and the vwep extension is available. Can be toggled before a match starts with the 'vwep' in-game command.
>
> 0 = visible weapons disabled.
> 1 = visible weapons enabled.
>
> Default: 1.
> Set by: server config or 'vwep' command before match start.

### Shape classification

Shape 1 (cvar + paired toggle command) + Shape 4 dependency (k_allow_vwep must be on for the toggle to fire).

`k_vwep` is toggled by the `vwep` command via `cvar_toggle_msg(self, "k_vwep", redtext("vwep"))` at commands.c:8597. Shape 1 confirmed. The `vwep` handler also gates on `cvar("k_allow_vwep")` at commands.c:8592 -- if `k_allow_vwep` is off, the toggle silently does nothing. This is Shape 4 composition: `k_allow_vwep` gates whether the toggle is effective. The value enum 0/1 belongs on this cvar card.

### Proposed draft

```
Controls whether visible weapons are active when the vwep extension is available.

0 = visible weapons off.
1 = visible weapons on (when k_allow_vwep is also enabled).

Prerequisites: k_allow_vwep must be enabled -- this cvar has no effect (and the 'vwep' toggle silently does nothing) if k_allow_vwep is off.

Permission:    server config or 'vwep' command in-game (pre-match only).
Match-state:   pre-match only.
Default:       1.

Example:
  # server.cfg
  k_allow_vwep 1   // master enable (models precached on map load)
  k_vwep 1         // start with vwep on

  # in-game toggle
  vwep             // flips k_vwep between 0 and 1 (if k_allow_vwep is on)

See also: k_allow_vwep (master gate -- must be on for this to matter), vwep (paired toggle command).
```

### Notes

- Verification: both `cvar("k_allow_vwep")` gate-read sites confirmed at world.c:358 and world.c:378. `cvar_toggle_msg(self, "k_vwep", ...)` at commands.c:8597 confirms Shape 1 pair.
- The "vwep extension is available" condition (`vw_available`) is a server-side check done at startup; not user-controllable and not load-bearing for the reader's action plan -- omitted from L1.
- Shape composition: Shape 1 primary (cvar+toggle pair), Shape 4 secondary (k_allow_vwep gates the toggle's effectiveness).

---

## k_allow_vwep (KTX cvar, Gameplay rules -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:874
- **Catalog line**: 6009
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master enable for visible weapons (vwep). When on, other players' currently-held weapon is shown as a model on their character. This is the master gate -- k_vwep only takes effect while this is on, and the in-game 'vwep' command is a no-op when this is off. Enabling also precaches the visible-weapon models on map load.
>
> 0 = vwep disabled.
> 1 = vwep enabled (k_vwep then acts as the per-player toggle).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (set-once in server config, no paired toggle) + Shape 4 (gates the `vwep` command and the `k_vwep` cvar's effect).

`k_allow_vwep` is registered via `RegisterCvarEx("k_allow_vwep", "0")` at world.c:874. No `cvar_toggle_msg` or cycle site exists for it -- it's server-config-only. It is read as a gate condition in the `ToggleVwep` handler at commands.c:8592 (`if (!vw_available || !cvar("k_allow_vwep")) { return; }`), making it a Shape 4 gating cvar.

### Proposed draft

```
Master switch for the visible-weapons extension -- enables weapon-model rendering on other players and precaches the vwep models on map load.

0 = vwep extension off; 'vwep' toggle command is a no-op.
1 = vwep extension on; k_vwep then controls whether it is active each match.

Effect:
  - When set to 1, vwep models are precached on map load.
  - k_vwep and the 'vwep' toggle command have no effect while this is 0.

Permission:    server config only.
Default:       0.

Example:
  # server.cfg
  k_allow_vwep 1  // enable extension and model precaching
  k_vwep 1        // start matches with vwep active

See also: k_vwep (per-match state cvar), vwep (in-game toggle, no-op when this is off).
```

### Notes

- Verification: `RegisterCvarEx("k_allow_vwep", "0")` confirmed at world.c:874. Gate-read at commands.c:8592 and world.c:358,378 confirmed.
- Existing description is accurate. Recast reorganizes into v2 shape with Effect slot surfacing the precache behavior and gate-dependency more clearly.

---

## vwep (KTX command, Gameplay rules -- Shape 1 command side + Shape 4 gated)

- **Status**: drafted
- **Source**: src/commands.c:1001
- **Catalog line**: 7875
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles visible weapons (k_vwep): when on, each player's held weapon is shown as a 3D model on their character. Broadcasts the on/off change and immediately refreshes all players' weapon models. No effect during a live match or if the server lacks vwep support or k_allow_vwep is disabled.
>
> Default: off (k_vwep = 0).
> Set by: player or spectator-admin command 'vwep'; server config (k_vwep / k_allow_vwep).

### Shape classification

Shape 1 command side (toggles k_vwep via cvar_toggle_msg) + Shape 4 gated by k_allow_vwep.

Registration: `{ "vwep", ToggleVwep, 0, CF_PLAYER | CF_SPC_ADMIN, CD_VWEP }` at commands.c:1001. Handler uses `cvar_toggle_msg(self, "k_vwep", redtext("vwep"))` at commands.c:8597. The handler silently returns (no-op) if `k_allow_vwep` is off or vwep is unavailable (commands.c:8592). Per Shape 1 command-side discipline: no value enum here (lives on k_vwep card).

### Proposed draft

```
Toggles the visible-weapons setting (k_vwep) -- flips whether other players can see the weapon model you are currently holding.

Prerequisites: k_allow_vwep must be enabled -- command silently does nothing otherwise.

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  vwep   // flips k_vwep between 0 and 1; broadcasts result to all players

See also: k_vwep (the cvar this toggles), k_allow_vwep (master gate).
```

### Notes

- Verification: CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1001 -- "any player or admin spectator", not admin-only.
- match_in_progress early-return confirmed at commands.c:8587.
- No value enum on command card; lives on k_vwep card (Shape 1 discipline).
- The "immediately refreshes all players' weapon models" behavior (W_SetCurrentAmmo loop at commands.c:8601-8606) is an implementation detail not load-bearing for the user's action plan -- omitted.

---

## k_spw (KTX cvar, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/world.c:856
- **Catalog line**: 6941
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects the spawn-point selection algorithm. Cycle with the 'spawn' admin command (-1 -> 0 -> 1 -> 2 -> 3 -> 4 -> -1).
>
> -1 = pre-qtest (nonrandom).
> 0 = normal QW respawns.
> 1 = KT SpawnSafety (anti-telefrag push-away active).
> 2 = Kombat Teams respawns (relaxed nearby-player exclusion in-match; SpawnSafety when k_checkx is off).
> 3 = KTX respawns (relaxed nearby-player exclusion in-match; same-spot exclusion active).
> 4 = KTX2 respawns (relaxed nearby-player exclusion; no same-spot exclusion; spawn re-check active).
>
> Default: 0.
> Set by: server config or 'spawn' admin command in-game.

### Shape classification

Shape 2 (cvar + paired cycle command).

`RegisterCvar("k_spw")` at world.c:856 (empty default = 0). The `spawn` command handler `ToggleRespawns` at commands.c:2676 reads `cvar("k_spw")`, increments + wraps (-1 through 4), writes back via `cvar_fset("k_spw", k_spw)` at commands.c:2690. Confirmed Shape 2 cycle pattern. `spawn` registration: `CF_PLAYER | CF_SPC_ADMIN` at commands.c:717 -- any player or admin spectator, not admin-only.

### Proposed draft

```
Selects the spawn-point selection algorithm used during matches.

-1 = pre-qtest (nonrandom, historical mode).
 0 = standard QW respawns.
 1 = KT SpawnSafety (anti-telefrag push-away active).
 2 = Kombat Teams respawns (relaxed nearby-player exclusion; SpawnSafety when k_checkx is off).
 3 = KTX respawns (relaxed nearby-player exclusion; same-spot exclusion active).
 4 = KTX2 respawns (relaxed nearby-player exclusion; no same-spot exclusion; spawn re-check active).

Permission:    server config or 'spawn' command in-game (any player or admin spectator, pre-match only).
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg
  k_spw 3   // KTX respawns

  # in-game
  spawn     // cycles: -1 -> 0 -> 1 -> 2 -> 3 -> 4 -> -1

See also: spawn (paired cycle command).
```

### Notes

- FLAG: The existing description says "Cycle with the 'spawn' admin command." The `spawn` command is registered as `CF_PLAYER | CF_SPC_ADMIN` (commands.c:717) -- any player or admin spectator, not admin-only. Recast reflects source-truth.
- Default: `RegisterCvar("k_spw")` at world.c:856 uses empty-default variant = 0. Confirmed.

---

## k_frp (KTX cvar, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/world.c:869
- **Catalog line**: 6290
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Fairpacks: controls which weapon appears in the backpack a player drops on death.
>
> 0 = the weapon currently wielded at death.
> 1 = the best weapon the player holds with ammo (highest-tier).
> 2 = the last weapon fired (dropped even if it has no ammo).
>
> Default: 0.
> Set by: server config or 'fairpacks' admin command in-game.

### Shape classification

Shape 2 (cvar + paired cycle command).

`RegisterCvar("k_frp")` at world.c:869 (empty default = 0). The `fairpacks` command `ToggleFairPacks` at commands.c:3175 reads `cvar("k_frp")`, increments (bound 0-2), wraps at 3 back to 0, writes via `cvar_fset("k_frp", k_frp)` at commands.c:3194. Confirmed Shape 2 cycle pattern. `fairpacks` registration: `CF_PLAYER` at commands.c:758 -- any player (spectators excluded), not admin-only.

### Proposed draft

```
Controls which weapon goes into the backpack a player drops on death.

0 = weapon held at moment of death.
1 = best weapon the player has with ammo (highest-tier).
2 = last weapon fired (dropped even without ammo).

Permission:    server config or 'fairpacks' command in-game (any player, pre-match only).
Match-state:   pre-match only.
Default:       0.

Example:
  # server.cfg
  k_frp 1   // best-weapon drop

  # in-game
  fairpacks  // cycles: 0 -> 1 -> 2 -> 0

See also: fairpacks (paired cycle command).
```

### Notes

- FLAG: The existing description says "Set by: server config or 'fairpacks' admin command in-game." The `fairpacks` command is registered as `CF_PLAYER` (commands.c:758) -- any player (spectators excluded), not admin-only. Recast reflects source-truth.
- Default: `RegisterCvar("k_frp")` at world.c:869 = empty default = 0. Confirmed.

---

## k_socd (KTX cvar, Gameplay rules -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1017
- **Catalog line**: 6876
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enforcement level for SOCD (simultaneous-opposing-cardinal-direction) / movement-assistance detection. Detection runs continuously for all players; warn and kick outputs apply to human players only.
>
> 0 = allow (detection runs silently, no public action).
> 1 = stats only (SOCD detection count shown in post-game stats).
> 2 = warn (public warning broadcast after repeated detections, prewar only).
> 3 = kick (force-disconnect after repeated detections).
>
> Default: 1.
> Set by: server config or 'socd' admin command in-game.

### Shape classification

Shape 2 (cvar + paired cycle command).

`RegisterCvarEx("k_socd", "1")` at world.c:1017 (default 1). The `socd` command handler at commands.c:9398 reads `cvar("k_socd")`, increments by 1, wraps back to SOCD_ALLOW (0) when exceeding SOCD_KICK (3), writes back via `cvar_set("k_socd", ...)` at commands.c:9429. Confirmed Shape 2 cycle pattern. `socd` registration: `CF_PLAYER` at commands.c:1040 -- any player (spectators excluded), not admin-only.

### Proposed draft

```
Enforcement level for SOCD (simultaneous-opposing-cardinal-direction) input detection.

0 = allow: detection runs silently, no public output.
1 = stats: SOCD event count recorded and shown in post-game stats.
2 = warn: public broadcast warning issued after repeated detections (pre-match only).
3 = kick: force-disconnect after repeated detections.

Permission:    server config or 'socd' command in-game (any player, pre-match only).
Match-state:   pre-match only.
Default:       1.

Example:
  # server.cfg
  k_socd 3   // kick on repeated SOCD

  # in-game
  socd       // cycles: 0 -> 1 -> 2 -> 3 -> 0

See also: socd (paired cycle command).
```

### Notes

- FLAG: The existing description says "Set by: server config or 'socd' admin command in-game." The `socd` command is registered as `CF_PLAYER` (commands.c:1040) -- any player (spectators excluded), not admin-only. Recast reflects source-truth.
- SOCD constant values verified: SOCD_ALLOW=0, SOCD_STATS=1, SOCD_WARN=2, SOCD_KICK=3 (g_consts.h:346-349).
- Default: `RegisterCvarEx("k_socd", "1")` confirmed at world.c:1017. Existing description states default 1 -- verified correct.

---

## giveme (KTX command, Gameplay rules -- Shape 4b)

- **Status**: drafted
- **Source**: src/commands.c:1036
- **Catalog line**: 7296
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cheat command. Grants the calling player a powerup or runes. Requires the *cheats serverinfo key to be set; refused otherwise.
>
> giveme <q|p|r|s> [seconds] -- grants Quad (q), Pentagram (p), Ring (r), or Biosuit (s) for the given duration (default 30 s).
> giveme rune [1-4] -- grants the numbered runeflag.
> giveme runes -- grants all four runes.
> giveme norunes -- clears all four runes.
>
> Default: n/a (command).
> Set by: any player (requires cheats enabled on the server).

### Shape classification

Shape 4b (serverinfo-key-gated command) -- canonical example per worked-examples.md.

Registration: `{ "giveme", giveme, 0, CF_PLAYER | CF_MATCHLESS | CF_PARAMS, CD_GIVEME }` at commands.c:1036. Handler checks `if (strnull(ezinfokey(world, "*cheats"))) { G_sprint(..., "Cheats are disabled..."); return; }` at commands.c:8951. This is the canonical Shape 4b signal: gate is the `*cheats` serverinfo key, not a `k_*` cvar. Existing description is accurate.

### Proposed draft

```
Grants the calling player a powerup or runeflag -- a cheat-mode command for testing and development.

Prerequisites: the '*cheats' serverinfo key must be set on the server; refused with "Cheats are disabled on this server" otherwise.

Effect:
  giveme q [seconds]    -- Quad Damage for <seconds> (default 30).
  giveme p [seconds]    -- Pentagram of Protection for <seconds> (default 30).
  giveme r [seconds]    -- Ring of Shadows for <seconds> (default 30).
  giveme s [seconds]    -- Biosuit for <seconds> (default 30).
  giveme rune [1-4]     -- grants the numbered rune flag.
  giveme runes          -- grants all four rune flags.
  giveme norunes        -- clears all four rune flags.

Permission:    any player (spectators excluded; available in matchless mode).

Example:
  # Enable cheats on the server first:
  serverinfo *cheats 1

  # Then in-game:
  giveme q 60    // Quad Damage for 60 seconds
  giveme runes   // grant all four rune flags

See also: *cheats (serverinfo key that gates this command).
```

### Notes

- Verification: `strnull(ezinfokey(world, "*cheats"))` gate at commands.c:8951 confirmed. Canonical Shape 4b signal.
- CF_PLAYER | CF_MATCHLESS at commands.c:1036: "any player" (spectators excluded), available in matchless mode.
- The existing description is substantially correct. Recast applies v2 shape with Prerequisites up-front per Shape 4b discipline and organizes invocation forms as a scannable Effect block.
- Canonical Shape 4b example per worked-examples.md applied as instructed by the dispatcher.

---

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

## handicap (KTX command, Gameplay rules -- Shape 4 gated command)

- **Status**: drafted
- **Source**: src/commands.c:836
- **Catalog line**: 7329
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets your own handicap level as a percentage (50-150). 100 = handicap off. Values below 100 reduce the damage you deal as the attacker; handicap does not affect the damage or armor protection you receive as a target. Silently refused while a match is in progress. Refused with a message when the server has locked handicap changes ("handicap changes are not allowed"). Refused entirely in LGC mode. With no argument, prints the usage hint instead of changing anything.
>
> Set by: any in-game player via 'handicap <value>' command.

### Shape classification

Shape 4 gated command (k_lock_hdp gates via SetHandicap at g_utils.c:1674).

Registration: `{ "handicap", handicap, 0, CF_PLAYER | CF_PARAMS | CF_MATCHLESS, CD_HANDICAP }` at commands.c:836. The handler calls `SetHandicap()` which checks `match_in_progress` (silent refusal, g_utils.c:1669) then `cvar("k_lock_hdp")` (message refusal: "handicap changes are not allowed", g_utils.c:1674). LGC refusal confirmed at commands.c:5213. All existing description claims verified correct.

### Proposed draft

```
Sets your handicap level as a percentage (50-150) -- scales outgoing damage you deal as the attacker.

100 = handicap off (full damage).
Values below 100 reduce your outgoing damage; values above 100 increase it.
Handicap does not affect incoming damage or armor protection.

Prerequisites:
  - k_lock_hdp must be 0 -- refused with "handicap changes are not allowed" otherwise.
  - LGC mode must be inactive -- refused with "Handicap is not allowed in LGC mode" if active.

Permission:    any player (spectators excluded).
Match-state:   pre-match only (silently refused during a live match).

Example:
  handicap 80   // deal 80% of normal damage
  handicap 100  // turn handicap off

See also: k_lock_hdp (server gate that locks handicap for all players), hdptoggle (admin toggle for k_lock_hdp).
```

### Notes

- Verification: match_in_progress check in SetHandicap at g_utils.c:1669, k_lock_hdp gate at g_utils.c:1674, LGC check at commands.c:5213. All confirmed.
- CF_PLAYER | CF_PARAMS | CF_MATCHLESS at commands.c:836: "any player" (spectators excluded), available in matchless mode. CF_MATCHLESS is availability-broadening; not surfaced as a restrictive match-state constraint.
- Bidirectional cross-link: See-also points to both k_lock_hdp (gate cvar) and hdptoggle (the toggle command for that gate). k_lock_hdp card's See-also points back to handicap.

---

## k_lock_hdp (KTX cvar, Gameplay rules -- Shape 1 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:801
- **Catalog line**: 6383
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Locks player handicap. When enabled, every player's effective handicap is forced to 100 (neutral) and attempts to change it are refused.
>
> 0 = handicap allowed (players may set their own value).
> 1 = handicap locked (forced to 100; changes refused with "handicap changes are not allowed").
>
> Default: 0.
> Set by: server config or 'handicap' admin command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command) + Shape 4 (gates the `handicap` player command).

`RegisterCvar("k_lock_hdp")` at world.c:801 (empty default = 0). The `hdptoggle` command at commands.c:5196 flips this cvar: `trap_cvar_set_float("k_lock_hdp", !cvar("k_lock_hdp"))` at commands.c:5203 with `match_in_progress` early-return at line 5198. Binary toggle pattern -- Shape 1 relationship holds even though the handler uses `trap_cvar_set_float` rather than `cvar_toggle_msg`. Shape 4: `k_lock_hdp` is read as a gate in `SetHandicap` at g_utils.c:1674, blocking the `handicap` player command when set.

### Proposed draft

```
Locks handicap changes -- when enabled, every player's effective handicap is forced to 100 (neutral) and attempts to change it are refused.

0 = handicap changes allowed.
1 = handicap locked; effective value forced to 100 for all players; 'handicap' command refused with "handicap changes are not allowed".

Permission:    server config or 'hdptoggle' command in-game (admin only, pre-match only).
Match-state:   pre-match only (hdptoggle refused during live match).
Default:       0.

Example:
  # server.cfg
  k_lock_hdp 1   // always-locked server

  # in-game (admin)
  hdptoggle      // toggles k_lock_hdp between 0 and 1

See also: hdptoggle (paired toggle command), handicap (player command gated by this cvar).
```

### Notes

- FLAG: The existing description says "Set by: server config or 'handicap' admin command in-game." The command that toggles `k_lock_hdp` is `hdptoggle` (commands.c:5203), NOT `handicap`. The `handicap` command is the one GATED by `k_lock_hdp`. The existing description conflates the gating cvar's toggler with the gated command. Recast corrects this to "hdptoggle".
- `hdptoggle` is `CF_BOTH_ADMIN` at commands.c:835 = admin only. Permission line reflects this.
- Bidirectional cross-link: See-also points to both `hdptoggle` (toggler) and `handicap` (gated command). `handicap` card's See-also points back here -- both directions present in this batch.
- `hdptoggle` uses `trap_cvar_set_float("k_lock_hdp", !cvar("k_lock_hdp"))` rather than `cvar_toggle_msg`, but the behavioral relationship (dedicated binary-flip command for this cvar) is Shape 1.
---

# Sub-group: Misc utility commands (9)

Standalone utility commands without clean Layer B relationships. Mostly shape-less: `kill`, `wreg`, `rnd`, `shownick`, `teleteam`, `tp`, `removeitem`. Shape 1c `nosweep` (deathmatch!=1 mode-precondition). Shape 1 `yawnmode` (pairs with `k_yawnmode`).

---

## kill (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/client.c:943
- **Catalog line**: 7356
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Kills your own player (suicide). Blocked while the server is paused or in standby, in RA mode, during CA/wipeout at restricted times (wipeout-round suicide also blocks respawn for that round), and during the first 10 seconds of a CTF match. Rate-limited to one per second.
>
> Default: n/a (command).
> Set by: any player.

### Shape classification

shape-less. Pure standalone action command. No cvar pair, no election, no vote mechanism, no family head. The command performs a single one-shot action (suicide) with internal refusal conditions. The Layer B catalog captures inter-entity relationship patterns; `kill` has none.

### Proposed draft

```
Kills your own player (suicide). Rate-limited to one per second.

Effect:
  Kills the calling player immediately. In CA/wipeout mode, a suicide
  during an active round also blocks the player's respawn for that round.

Prerequisites:
  Refused while the server is paused.
  Refused while k_standby is in effect.
  Refused in RA mode ("Can't suicide in RA mode").
  Refused in CA/wipeout except during an active fight round with no round pause.
  Refused during the first 10 seconds of a CTF match.

Permission:    any player (spectators excluded)
Match-state:   any time

Example:
  kill
```

### Notes

- Verification: handler is `ClientKill` in `src/client.c:943`, registered at `src/commands.c:947` with `CF_PLAYER | CF_MATCHLESS`.
- `CF_MATCHLESS` (bit 4) = "command valid for matchless mode" -- means it is available pre-match AND mid-match. No match-state restriction at the CF level; the handler's internal checks handle specific blocked situations.
- Existing description correctly identifies all blocked conditions. Recast restructures them as Prerequisites and surfaces the CA/wipeout respawn consequence in Effect.
- v1 "Default: n/a (command)" and "Set by" lines removed in v2 (commands have no Default; Permission replaces Set-by).

---

## wreg (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:946
- **Catalog line**: 7903
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Manages server-side weapon-priority script slots. Each slot is keyed to a single character and holds a weapon-impulse sequence (digits, optionally prefixed with + or - to force or release the attack button).
>
> No argument: lists all registered slots.
> One argument (character): shows that slot's current registration.
> Two arguments (character + order): registers the sequence; empty order clears the slot.
>
> Up to 20 slots; weapon order max 10 characters.
> Set by: any player or spectator-admin, usable outside a match.

### Shape classification

shape-less. Per-player slot-manager command with multi-arity dispatch. No paired `k_wreg` cvar exists (confirmed: no `RegisterCvar("k_wreg")` in `world.c`). The slot state lives in `self->wreg[]` (per-player struct array). No election, vote, family, or cycle cvar relationship. Standalone slot manager.

### Proposed draft

```
Manages your server-side weapon-priority script slots. Each slot is keyed
to a single character and holds a weapon-impulse sequence the server uses
to auto-execute weapon changes on your behalf.

Effect:
  - No argument: lists all currently registered slots for you.
  - One argument (character): shows that slot's current sequence.
  - Two arguments (character + sequence): registers the sequence in the
    slot; an empty sequence string clears the slot.
  Sequences consist of weapon impulse digits (1-8), optionally prefixed
  with '+' to hold attack or '-' to release it before switching.
  Up to 20 slots total; each sequence is capped at 10 characters.

Permission:    any player or spectator
Match-state:   any time

Example:
  wreg             ; list all registered slots
  wreg a           ; show what is bound to slot 'a'
  wreg a 1234      ; register sequence '1234' in slot 'a'
  wreg a ""        ; clear slot 'a'
```

### Notes

- Verification: registration at `src/commands.c:946` with `CF_BOTH | CF_MATCHLESS | CF_PARAMS`. `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` = any player or spectator (no admin requirement).
- FLAG: Existing description says "spectator-admin" but `CF_BOTH` grants any spectator access without admin rights. The proposed draft corrects Permission to "any player or spectator".
- Handler is `cmd_wreg` at `src/commands.c:7290`. The `self->wreg` NULL guard silently exits if the server has not allocated wreg storage for the caller -- not user-actionable.
- v1 "Set by" and "usable outside a match" replaced by Permission + Match-state in v2.

---

## nosweep (KTX command, Gameplay rules -- Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:954
- **Catalog line**: 7440
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles NoSweep mode on or off (flips k_nosweep) and announces the new state to all players. Only accepted during a rules-change window and only when the server is running dmm1.
>
> Set by: admin command 'nosweep' in-game (dmm1 + rules-change-allowed required).

### Shape classification

Shape 1c (Shape 1 + mode-precondition). Handler `ToggleNoSweep` at `src/commands.c:7705` calls `is_rules_change_allowed()` then checks `deathmatch != 1` (refuses with "nosweep requires dmm1") then calls `cvar_toggle_msg(self, "k_nosweep", redtext("NoSweep"))`. This matches Shape 1c exactly: a toggle command for a boolean cvar gated on a base game mode.

### Proposed draft

```
Toggles NoSweep mode on or off (flips k_nosweep), broadcasting the new
state to all players. In NoSweep mode players cannot pick up weapons they
already carry.

Effect:
  Flips k_nosweep between 0 and 1. The new state is broadcast to all players.

Prerequisites:
  dmm1 must be the active deathmatch mode ("nosweep requires dmm1").
  A rules-change window must be open (is_rules_change_allowed()).

Permission:    any player or admin spectator
Match-state:   pre-match only (rules-change window enforced by is_rules_change_allowed())

Example:
  dm 1        ; switch to dmm1 first if not already set
  nosweep     ; toggle NoSweep on

See also: k_nosweep (state cvar this toggles)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'nosweep'" implying admin-only permission. Source registration is `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator, NOT admin-only. The proposed draft corrects this.
- Verification: `ToggleNoSweep` at `src/commands.c:7705`. `cvar_toggle_msg(self, "k_nosweep", ...)` confirmed. `k_nosweep` registered at `src/world.c:909` with default "0".
- Engine auto-correction: `src/world.c:1775` clears `k_nosweep` when deathmatch mode switches away from 1 -- users cannot strand the setting in a broken state.

---

## rnd (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:901
- **Catalog line**: 7552
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Picks one item at random from the supplied space-separated list and broadcasts the candidates and the selected value to all players. With no arguments prints usage to the caller. Refused silently during a live match.
>
> Set by: any player ('rnd <option1> <option2> ...'). Blocked during match.

### Shape classification

shape-less. Standalone random-selection utility command. No paired cvar, no vote mechanism, no family head, no sibling relationship. Pre-match community tool for picking maps, sides, etc.

### Proposed draft

```
Picks one item at random from a space-separated list and broadcasts both
the full candidate list and the selected item to all players.

Effect:
  Broadcasts the candidate list and the selected winner to all players via
  global print. With no arguments, prints usage to the caller only.

Permission:    any player or spectator
Match-state:   pre-match only (refused silently during a live match)

Example:
  rnd aerowalk dm3 ztndm3   ; randomly selects one of the three maps
                             ; and broadcasts the result to all players
```

### Notes

- Verification: handler `krnd` at `src/commands.c:6707`. `match_in_progress` early-return at line 6713 is silent (no print). Registration with `CF_BOTH | CF_PARAMS` = any player or spectator.
- "Refused silently" confirmed: the `if (match_in_progress) { return; }` block has no G_sprint.
- v1 "Set by" and block-note replaced by Permission + Match-state in v2.

---

## shownick (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:762
- **Catalog line**: 7579
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Reports stats for the player you are currently aiming at. In prewar, any visible player is eligible; during a live match only teammates are shown (Team / CTF mode required). Uses line-of-sight detection within a ~60-degree cone around your aim direction.
>
> 0 = (default) displays a centerprint with the target's powerups, armor, ammo per weapon, health, and nick (auto-cleared after 0.8 s).
> 1 = sends a machine-readable data line to your client HUD instead.
>
> Set by: any player ('shownick' or 'shownick 1' in-game).

### Shape classification

shape-less. Standalone teammate-stat viewer. No paired cvar. The "0 / 1" argument is an inline output-mode selector, not a KTX cvar. No election, vote, or family relationship.

### Proposed draft

```
Reports the stats of the teammate nearest to your crosshair, using
line-of-sight detection within roughly a 60-degree cone around your aim.

Effect:
  - No argument (or 0): displays a centerprint with the target's powerups,
    armor type, ammo counts per weapon, health, and nick. Auto-clears after
    0.8 seconds.
  - Argument 1: sends a machine-readable data line to your client HUD parser
    instead of the centerprint.
  During prewar, any visible living player is eligible (not just teammates).
  During a live match, only teammates are shown; non-teammates are silently
  skipped.

Prerequisites:
  Team or CTF mode must be active for mid-match use. Non-team modes suppress
  the command entirely during a live match.

Permission:    any player (spectators excluded)
Match-state:   any time

Example:
  shownick      ; aim at a teammate and invoke to see their stats
  shownick 1    ; HUD-mode output for clients that parse the //sn line

See also: options (match-setting roster)
```

### Notes

- Verification: handler `ShowNick` at `src/commands.c:3809`. Registration with `CF_PLAYER | CF_PARAMS`.
- Match-state logic: `if (!match_in_progress) { ; /* allow anyway */ } else if (!isTeam() && !isCTF()) { return; }` -- any-time with team-mode requirement during match.
- The ~60-degree cone claim: `miss > (dist * 1.7)` at line 3898 -- this is the angular cutoff; approximately matches 60 degrees off-axis.
- Argument 1 path sends via `stuffcmd(self, "//sn %d ...")` for HUD client parsing -- confirmed source-backed.

---

## teleteam (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:979
- **Catalog line**: 7708
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Toggles whether team telefrags count toward the frag score. The change is broadcast to all players. Blocked while a match is in progress.
>
> 0 = team telefrags do not affect frags.
> 1 = team telefrags count toward frags.
>
> Set by: admin command 'teleteam' in-game (cycles the setting; blocked mid-match).

### Shape classification

shape-less. The `teleteam` handler manually reads `cvar("k_tp_tele_death")`, inverts it (0 iff nonzero, 1 iff zero), and writes back via `cvar_fset`. This is a binary toggle of `k_tp_tele_death` but does NOT use the Shape 1 `cvar_toggle_msg` idiom. The shape catalog's identification guide keys on `cvar_toggle_msg` calls; without it, Shape 1 is not assignable. The relationship exists (command flips a cvar), but the Layer B catalog is built on source signature patterns. Shape-less is the correct outcome. Park trigger 1 does not apply because `teleteam` has no novel inter-entity relationship requiring a new shape -- it is simply a standalone toggle command that uses the manual-flip idiom rather than the KTX helper.

### Proposed draft

```
Toggles whether team telefrags count toward the frag score, broadcasting
the new setting to all players.

Effect:
  Flips k_tp_tele_death between 0 and 1:
  0 = team telefrags do not affect frag scores.
  1 = team telefrags count toward frag scores.
  The new state is broadcast to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  teleteam    ; toggle team-telefrag scoring on or off

See also: k_tp_tele_death (the underlying state cvar)
```

### Notes

- FLAG: Existing description says "Admin command" and "Set by: admin command" implying admin-only. Source registration at `src/commands.c:979` is `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator, NOT admin-only. The proposed draft corrects this.
- Verification: handler `teleteam` at `src/commands.c:7995`. Manual flip: `k_tp_tele_death = (k_tp_tele_death ? 0 : 1)` then `cvar_fset("k_tp_tele_death", k_tp_tele_death)`. `match_in_progress` check at line 7999 returns silently.
- `k_tp_tele_death` registered at `src/world.c:981` via `RegisterCvar("k_tp_tele_death")` (no default arg = defaults to "0").
- The value enum is retained in the draft because `k_tp_tele_death` may not yet have its own cross-linked card; keeping it here aids discoverability.

---

## tp (KTX command, Gameplay rules -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:730
- **Catalog line**: 7848
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the teamplay setting through 1 -> 2 -> 3 -> 4 -> 1 and broadcasts the new value. Has no effect while a match is in progress. Only available in team or CTF modes.
>
> Set by: admin command 'tp'.

### Shape classification

shape-less. `ChangeTP` cycles the engine `teamplay` cvar (not a KTX `k_*` cvar) via `cvar_fset("teamplay", ...)`. This resembles Shape 2 (cycle command), but Shape 2 pairs with a KTX-registered `k_*` entity. The engine `teamplay` cvar is not a KTX L1 entity. No catalog shape applies to a command cycling a pure engine cvar without a KTX cvar counterpart.

### Proposed draft

```
Cycles the server's teamplay setting one step forward (1 -> 2 -> 3 -> 4 -> 1),
broadcasting the new value to all players.

Effect:
  Increments the engine 'teamplay' cvar by 1, wrapping from 4 back to 1.

Prerequisites:
  Team or CTF mode must be active. Non-team mode refuses the command
  ("non team mode disallows you to change teamplay setting").

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  tp    ; step teamplay forward one increment
  tp    ; call again to step again (wraps 1->2->3->4->1)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'tp'" implying admin-only. Source registration at `src/commands.c:730` is `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator, NOT admin-only. The proposed draft corrects this.
- Verification: handler `ChangeTP` at `src/commands.c:2902`. `match_in_progress` check at line 2904 returns silently. `!isTeam() && !isCTF()` check at line 2909 prints the mode-requirement message and returns. Cycle: `teamplay++` then `if (teamplay == 5) teamplay = 1`, then `cvar_fset("teamplay", ...)`.
- `teamplay` is a QW engine cvar (not a KTX entity). Teamplay bitmask semantics are engine-defined; not documented here.

---

## yawnmode (KTX command, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:997
- **Catalog line**: 7935
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles yawn mode on or off and announces the new state. Yawn mode is an alternate KTX ruleset that changes several combat and physics rules: axe damage becomes 50 in dmm3 (instead of 20), shotguns fire more non-randomised pellets, armour protection values are altered, backpacks always drop on death regardless of cause, and fall-bunny is enabled. Only accepted during a rules-change window.
>
> Set by: player or spectator-admin command 'yawnmode' in-game.

### Shape classification

Shape 1 (cvar + paired toggle command, binary flip). Handler `ToggleYawnMode` calls `is_rules_change_allowed()` then `cvar_toggle_msg(self, "k_yawnmode", redtext("yawnmode"))`. No mode-precondition before the toggle (no `isDuel()` / `isCTF()` / deathmatch != X check) -- pure Shape 1, not Shape 1c.

### Proposed draft

```
Toggles yawn mode on or off (flips k_yawnmode), announcing the new state
to all players. Yawn mode is an alternate KTX ruleset with modified combat
and physics rules.

Effect:
  Flips k_yawnmode between 0 and 1. Changes take effect immediately. When
  enabled:
  - Axe damage is 50 in dmm3 (instead of the standard 20).
  - Shotguns fire more pellets with reduced randomisation.
  - Armour protection values are altered.
  - Backpacks always drop on death regardless of cause.
  - Fall-bunny (k_fallbunny) is enabled.

Prerequisites:
  A rules-change window must be open (is_rules_change_allowed()).

Permission:    any player or admin spectator
Match-state:   pre-match only (rules-change window enforced by is_rules_change_allowed())

Example:
  yawnmode    ; toggle yawn mode on
  yawnmode    ; toggle off again

See also: k_yawnmode (state cvar this toggles), k_fallbunny (enabled by yawnmode)
```

### Notes

- Verification: handler `ToggleYawnMode` at `src/commands.c:8643`. Confirmed: `is_rules_change_allowed()` check, then `cvar_toggle_msg(self, "k_yawnmode", ...)`, then `FixYawnMode()`. No mode-precondition -- Shape 1, not Shape 1c.
- `k_yawnmode` registered at `src/world.c:1011` with default "0" (RegisterCvar with no default arg).
- `FixYawnMode()` at `src/commands.c:8636` caches the cvar value into a C variable. Applied immediately on toggle.
- Permission: `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator. Existing "player or spectator-admin" is correct in substance; recast uses canonical phrasing.
- Downstream rule effects sourced from existing description (accepted from prior L1 synthesis pass). The `FixYawnMode` function itself only caches `k_yawnmode` and `k_teleport_cap` -- the rule modifications are applied elsewhere via the global `k_yawnmode` C variable.

---

## removeitem (KTX command, Gameplay rules -- Shape 4b)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1038
- **Catalog line**: 7525
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes the placed item (from the 'dropitem' command) closest to the caller. Only affects items placed via 'dropitem' -- ordinary backpacks, death-drops, and powerup spawns are not affected. Prints "Removed <classname>" on success or "Nothing found around" if no placed item is nearby. Refused while a match is in progress and when cheats are disabled on the server.
>
> Set by: any player with cheats enabled ('removeitem' command; no match in progress).

### Shape classification

Shape 4b (serverinfo-key-gated command). Handler checks `strnull(ezinfokey(world, "*cheats"))` -- if the `*cheats` serverinfo key is not set, the command refuses with a message. This is the canonical Shape 4b source signature: a command gated by a serverinfo key rather than a `k_*` cvar.

### Proposed draft

```
Removes the placed item closest to you. Only items placed via the 'dropitem'
command are eligible -- ordinary backpacks, death-drops, and powerup spawns
are unaffected.

Effect:
  Finds the nearest dropitem-placed item in the map and removes it.
  Prints "Removed <classname>" on success, or "Nothing found around" if
  no placed item is nearby.

Prerequisites:
  The '*cheats' serverinfo key must be set on the server. Without it the
  command refuses: "Cheats are disabled on this server...".

Permission:    any player or spectator
Match-state:   pre-match only (refused silently during a live match)

Example:
  removeitem    ; removes the nearest dropitem-placed item

See also: dropitem (places items that removeitem can target)
```

### Notes

- FLAG: Existing description says "Set by: any player with cheats enabled" but `CF_BOTH` at `src/commands.c:1038` = any player or spectator (not just players). The proposed draft corrects to "any player or spectator".
- Verification: handler `removeitem` at `src/commands.c:9252`. Gate: `if (strnull(ezinfokey(world, "*cheats"))) { G_sprint(..., "Cheats are disabled..."); return; }` at line 9263. `match_in_progress` check at line 9258 returns silently (before cheats gate check).
- `ent->dropitem` field at line 9276 is the marker that distinguishes placed items from organic world items -- source-confirms "only dropitem-placed items" claim.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: Permission-line CF flag mislabel pattern — 7th consecutive batch

**Verdict**: ACTIONABLE

**Cards involved**: `powerups`, `powerups_pickup` (Chunk A); `dropquad`, `discharge` (Chunk B); `k_tp_tele_death`, `k_noitems`, `noitems`, `spawn`, `spawn_show`, `spawnicide`, `teleteam` (Chunks C+G); `fallbunny`, `airstep` (Chunk D); `k_spw`, `k_frp`, `k_socd`, `fairpacks` (Chunk F); `wreg`, `nosweep`, `tp`, `removeitem` (Chunk G). **~20 cards** flagged this batch alone.

**Observation**: The systemic `CF_PLAYER | CF_SPC_ADMIN` mislabel as "Admin command" continues at scale across 7 consecutive batches. This batch also surfaced: (i) `CF_PLAYER` alone mislabel ("admin command" → should be "any player (spectators excluded)" — `socd`, `fairpacks`); (ii) `CF_BOTH` under-label ("any player" or "spectator-admin" → should be "any player or spectator" — `wreg`, `removeitem`); (iii) cvar-side inheritance of command-side mislabels (cvars whose Set-by line names a paired toggle command inherit the mislabel from the command's prose).

**Source evidence**: `include/g_local.h:647-658` (CF flag definitions); per-card `src/commands.c` registration rows verified.

**Recommendation**: Apply all flagged corrections from per-card Notes blocks. **SKILL.md amendment candidate**: per the HANDOVER memo, 7th batch is the threshold for promoting the F1 audit from per-batch ad-hoc to a permanent Step 5 amendment in `~/.claude/skills/ktx-l1-rewrite/SKILL.md`. Recommend operator review the pattern and decide whether to (a) bake the CF-flag table into Step 5 as a mandatory check, (b) add a chunk-prompt template line that pre-empts mislabels, or (c) author an audit-pass tool that catches the pattern across already-applied L1 descriptions.

---

### F2: Default value errors / bare RegisterCvar zero-init pattern

**Verdict**: ACTIONABLE

**Cards involved**: `k_pow` (Chunk A — bare `RegisterCvar` registers default 0; existing description claims 1), `k_highspeed` (Chunk D — bare `RegisterCvar` default 0; existing description claims 320), `k_btime` and `k_short_gib` (Chunk E — both bare `RegisterCvar` default 0).

**Observation**: Same root-cause class as Admin & permissions batch's F4 + Match flow batch's F2 (k_exttime/k_freeze/k_lockmax/k_lockmin). When source uses `RegisterCvar("name")` (bare, no default arg), the default is 0; when it uses `RegisterCvarEx("name", "default", ...)`, the default is the second arg. Many existing descriptions report the "convention default" (the value commonly set in mode-preset bundles like `common_um_init`) rather than the registered default. The "convention default" claim is legitimate user-facing context but should be labeled as such, not stated as the cvar's registered default.

**Source evidence**: `RegisterCvar` vs `RegisterCvarEx` distinction at the world.c registration sites.

**Recommendation**: Apply flagged corrections per-card. Consider a wider sweep of bare `RegisterCvar` calls in `src/world.c` to surface other prior-batch cards with wrong-default flag opportunities (apply-pass-author one-time audit).

---

### F3: Cross-chunk Shape classification discrepancy — manual cvar_fset/trap_cvar_set_float treated as Shape 1?

**Verdict**: ACTIONABLE

**Cards involved**: `k_tp_tele_death` + `teleteam` (Chunks C / G); `tkfjump`, `tkrjump` (Chunk D); `k_lock_hdp` + `hdptoggle` (Chunk F).

**Observation**: Sub-agents disagreed on whether a paired toggle command that flips a cvar via `cvar_fset(cvar, !cvar.value)` or `trap_cvar_set_float(cvar, val)` (without using the standard `cvar_toggle_msg` helper) qualifies for **Shape 1** classification:
- Chunks C, D, F: classified as **Shape 1** (functionally equivalent — binary flip + paired command pattern).
- Chunk G's `teleteam` card: classified as **shape-less** ("Shape 1 source signature not strictly met" — the canonical signal is `cvar_toggle_msg`).

The per-card skill's `shape-catalog.md` Shape 1 definition reads: "handler is `void Toggle<Name>(void)` with `match_in_progress` early-return + `cvar_toggle_msg(self, '<cvar>', redtext(...))`." Strictly, only `cvar_toggle_msg` matches the source signature. But the behavioral pattern (binary flip via paired toggle command) is what Shape 1 captures.

**Source evidence**: `cvar_toggle_msg` at `src/g_utils.c`; `cvar_fset` and `trap_cvar_set_float` per-handler. Affected handlers: `Teleteam` (manual flip), `t_jump` (uses trap_cvar_set_float), `ToggleMapLock` / hdptoggle handler (uses trap_cvar_set_float).

**Recommendation**: Apply-pass-author adjudicates per-card. **Strong recommendation**: treat manual cvar_fset/trap_cvar_set_float binary-flip patterns as **Shape 1 (functional)** with a per-card note ("toggle uses manual cvar_fset, not cvar_toggle_msg") — the user-observable behavior is identical, and forcing them to shape-less hides the cvar+command relationship from See-also routing. This batch's `teleteam` recommendation: REVISE classification from shape-less → **Shape 1** to align with `k_tp_tele_death`'s Shape 1 classification (bidirectional cross-link). **SKILL.md amendment candidate**: extend Shape 1's source signature to include the manual-flip variant.

---

### F4: Foundational framing errors — drafted_with_flag, high-confusion class

**Verdict**: ACTIONABLE

**Cards involved**: `discharge`, `k_killquad` (Chunk B); `powerups_pickup`, `k_pow` (Chunk A); `k_nightmare_pu`, `k_bzk` (Chunk E); `k_lock_hdp` (Chunk F); `k_disallow_krjump` (Chunk D).

**Observation**: Eight cards had foundational framing errors in their existing descriptions that the recast corrected via FLAG:
- `discharge`: existing "chain-reaction self-damage" → source is `T_RadiusDamage` centered on shooter (radius damage to all in range; shooter takes half).
- `powerups_pickup`: existing "multiple powerups at the same time" → source blocks re-pickup of the **same type** while active.
- `k_pow`: existing toggle command name "pow" → source is `powerups`.
- `k_nightmare_pu`: existing toggle command name "nightmare_pu" → source is `coop_nm_pu` (commands.c:1042).
- `k_bzk`: existing "invulnerability for the rest of the match" → source grants 2-second burst only (`invincible_finished = time + 2`, match.c:711).
- `k_lock_hdp`: existing names `handicap` as toggler → `hdptoggle` is the actual toggle command; `handicap` is the gated command.
- `k_disallow_krjump`: existing "server config only" → `tkrjump` (CF_BOTH_ADMIN) toggles it via `t_jump` handler.
- `k_killquad`: existing "a dropped quad appears in play" → source requires carrier death AND `NeedDropQuad()` true (no living holder, no existing quad item).

**Source evidence**: per-card source refs listed in each card's Notes block.

**Recommendation**: Apply-pass-author REVIEWS each flagged card carefully — these aren't permission-line mislabels (mechanical) but framing errors that change the user's understanding of the entity's behavior. Verify the source citations, then apply the recast text.

---

### F5: Canonical-card decision — REJECTED for k_pow_p/q/r/s

**Verdict**: ACTIONABLE (informational)

**Cards involved**: `k_pow_p`, `k_pow_q`, `k_pow_r`, `k_pow_s` (Chunk A).

**Observation**: Canonical-card pattern (Shape 7 fan-out / Demo F5 precedent) considered for the four per-powerup spawn-gate cvars. **REJECTED** via source verification: `k_pow_q` and `k_pow_r` gate death-drop paths (suppressing `dq` and `dr` drop effects respectively when 0), while `k_pow_p` and `k_pow_s` do NOT (pent has no drop path; suit's drop returns early in `DropPowerup` for `IT_SUIT`). Drop-path asymmetry is load-bearing — siblings have a meaningful behavioral difference, not just letter-value variation.

**Source evidence**: `items.c:1972-1996` (`DropPowerups`), `items.c:2044-2071` (`DropPowerup` early-return for suit).

**Recommendation**: All four cards stay as separate full Shape 3 cards. This decision is the **third consecutive batch** where source verification overrides a handoff-doc hypothesis about canonical-card application (Frogbot F11 / Match flow F7 / this batch F5 — Rule 7 "hypotheses not contracts; trust source over handoff" continues working as intended).

---

### F6: vwep three-entity composition — L3 concept-note candidate

**Verdict**: INFORMATIONAL

**Cards involved**: `k_allow_vwep`, `k_vwep`, `vwep` (Chunk F).

**Observation**: The visible-weapon family is a notable three-entity composition: `k_allow_vwep` is the **master gate** (Shape 3 + Shape 4 — admin-disable knob); `k_vwep` is the **state cvar** (Shape 1 + Shape 4 — current effective state, gated by k_allow_vwep); `vwep` is the **paired toggle command** that flips `k_vwep` but silently no-ops if `k_allow_vwep` is off.

**Source evidence**: `commands.c:8592` (k_allow_vwep gate-read), `commands.c:8597` (cvar_toggle_msg for k_vwep).

**Recommendation**: No apply-pass action required — drafts are correct. Track as L3 concept-note candidate ("visible weapons" — the `vwep` workflow doc lives at ezquake.com/docs/player-skins per QW community lore). Apply-pass-author may pencil this into the L3 backlog.

---

### F7: dq/dr prerequisite gap — k_pow_q/k_pow_r + k_pow required

**Verdict**: ACTIONABLE

**Cards involved**: `dq`, `dr` (Chunk B) + cross-references to `k_pow_q`, `k_pow_r`, `k_pow` (Chunk A).

**Observation**: Existing `dq` and `dr` cvar descriptions omitted the per-type spawn-gate prerequisites that gate actual drop behavior. Source-verified: `dq` requires `k_pow_q != 0` (per `items.c:1974`) AND the master `k_pow` enable; `dr` requires `k_pow_r != 0` (per `items.c:1989`) AND `k_pow`. Both cvars' drafts now include the prerequisites; `dropquad` and `dropring` cards inherit the prereq context via See-also.

**Source evidence**: `items.c:1974` (dq gate), `items.c:1989` (dr gate), shared `k_pow` enable check.

**Recommendation**: Apply the new prerequisites to `dq` and `dr` cvar cards. Verify the bidirectional See-also chains: `dq` ↔ `dropquad` ↔ `k_pow_q` ↔ `k_pow`; `dr` ↔ `dropring` ↔ `k_pow_r` ↔ `k_pow`.

---

### F8: k_dis edge case — value 2 (CTF out-of-water) not toggleable

**Verdict**: ACTIONABLE (informational)

**Cards involved**: `k_dis`, `discharge` (Chunk B).

**Observation**: `k_dis` accepts three values: 0 (off), 1 (in-water self-discharge enabled), 2 (in-water + CTF out-of-water enabled). The `discharge` command uses `cvar_toggle_msg` which is binary (0↔1). If `k_dis` is currently set to 2 via server config, `discharge` toggles it to 0 (NOT back to 2). The command cannot restore value 2; operators must use server config to set value 2.

**Source evidence**: `cvar_toggle_msg` binary semantics; `k_dis` 3-value enum in registration + read sites.

**Recommendation**: Apply-pass-author preserves the surprise-bearing note in both cards' drafts. Worth highlighting on the L1 surface because operators setting `k_dis 2` in `server.cfg` will be surprised when in-game toggle drops to 0 without a return path.

---

### F9: k_end_tele_spawn / k_remove_end_hurt cross-link (end-map family)

**Verdict**: ACTIONABLE (informational)

**Cards involved**: `k_end_tele_spawn`, `k_remove_end_hurt` (Chunk C).

**Observation**: Both cvars are 'end' map-specific configuration knobs (controlling teleporter-adjacent spawn behavior + hurt/changelevel trigger removal). They form a coherent end-map customization pair. See-also cross-links between them surfaced in both drafts.

**Source evidence**: world.c:588 (k_end_tele_spawn read), triggers.c:978 + client.c:775 (k_remove_end_hurt reads).

**Recommendation**: Apply the See-also cross-links. Both cvars are server-config-only (Shape 3) — no apply-pass-author action beyond confirming the cross-links.

---

### F10: spawnicide ↔ spawn_show coupling

**Verdict**: ACTIONABLE

**Cards involved**: `spawnicide`, `spawn_show`, `k_spawnicide` (Chunk C).

**Observation**: Toggling `spawnicide` resets and reapplies the spawn-point display (commands.c:2753-2756). The cycle-cvars `k_spawnicide` and `k_spm_show` are behaviorally coupled — changing the spawn-rule re-publishes the per-spawn marker display. Surfaced as a labeled Effect bullet in both command cards.

**Source evidence**: `commands.c:2753-2756` (spawnicide handler invokes SpawnicideEnable/Disable + spawn-point display refresh).

**Recommendation**: Apply the cross-link in both command cards' See-also. Worth noting in any future "spawn point system" L3 concept note.

---

### F11: freeze cross-batch See-also — k_freeze (Match flow batch)

**Verdict**: ACTIONABLE — cross-batch apply

**Cards involved**: `freeze` (Chunk E, this batch); `k_freeze` (Match flow batch 2026-05-27).

**Observation**: `freeze` is the Shape 1 paired toggle command for `k_freeze`. `k_freeze` was drafted in the **prior batch (Match flow, 2026-05-27)** before `freeze` existed in any batch. Match flow's `k_freeze` draft does NOT include `freeze` in its See-also (couldn't — `freeze` wasn't drafted yet). This batch's `freeze` draft DOES include `k_freeze` in See-also.

**Source evidence**: `match.c:tbd` (`ToggleFreeze` handler calling `cvar_toggle_msg(self, "k_freeze", ...)`).

**Recommendation**: When applying drafts to L1, the apply-pass-author must:
1. Apply `freeze`'s draft from this batch (See-also includes `k_freeze`).
2. UPDATE `k_freeze`'s already-drafted-but-not-yet-applied Match flow card to add `freeze (paired toggle command)` to its See-also list. This is the bidirectional Shape 1 cross-link.

---

### F12: OctaPower / dmm4 claim in k_bzk + k_btime — unverifiable, dropped

**Verdict**: INFORMATIONAL — needs operator follow-up

**Cards involved**: `k_bzk`, `k_btime` (Chunk E).

**Observation**: Both existing descriptions claim "OctaPower in dmm4" mode-conditional behavior for the berzerk trigger. Source check at `match.c:689-714` shows the berzerk trigger path grants `IT_QUAD` unconditionally — no mode-conditional branch found. Sub-agent dropped the OctaPower claim from both recasts rather than flagging (FLAG: discipline reserved for localized contradictions; an unverifiable claim is dropped, not flagged, per the spot-check protocol).

**Source evidence**: `match.c:689-714` (berzerk trigger; no isCTF/isDMM4 branch).

**Recommendation**: Apply-pass-author may investigate whether OctaPower/dmm4 behavior lives in a SEPARATE source path (e.g. item-pickup mode-specific table) before applying these drafts. If a dmm4 branch exists, the dropped claim should be restored with the correct source citation. If not, the recast is correct as drafted.

---

### F13: Sub-agent /tmp file collision — dispatcher recovered cleanly (HANDOVER-level concern)

**Verdict**: CONFIRMED_CLEAN — dispatcher recovered

**Cards involved**: None directly (dispatcher-level, not card-level).

**Observation**: Chunks B and C wrote to `/tmp/chunk_B_output.md` and `/tmp/chunk_C_output.md` respectively, but found stale content from prior batches' runs already in those files. The sub-agents APPENDED their content to the stale files rather than overwriting. The dispatcher extracted only this batch's sections via line-range slicing during atomic assembly — no Gameplay rules content lost or duplicated. All 69 sections verified against entity name lists.

**Recommendation**: HANDOVER followup — `ktx-l1-batch-dispatcher` SKILL.md amendment candidate: either (a) use batch-date-suffixed /tmp filenames (`/tmp/chunk_X_output-<batch_date>.md`) to avoid collision, OR (b) instruct sub-agents to overwrite (not append) via `Write` tool's natural semantics (Write replaces, but the sub-agent may have used Edit which appends). Per-batch dispatcher prompts should also explicitly tell sub-agents to `Write` (clobber) not `Edit` (append).

---

### F14: wreg permission classification — CF_BOTH includes non-admin spectators

**Verdict**: ACTIONABLE

**Cards involved**: `wreg` (Chunk G).

**Observation**: Existing description called the permission "spectator-admin" (admin spectators only). Source registration is `CF_BOTH` (= `CF_PLAYER | CF_SPECTATOR`) — ANY spectator, not just admin spectators. Standard non-admin spec can invoke `wreg`. Flagged and corrected.

**Source evidence**: `src/commands.c` (wreg registration row).

**Recommendation**: Apply the corrected permission line ("any player or spectator").

---

### F15: removeitem permission classification — CF_BOTH includes spectators

**Verdict**: ACTIONABLE

**Cards involved**: `removeitem` (Chunk G).

**Observation**: Existing description's "any player" permission was too narrow. Source registration is `CF_BOTH` — any player OR any spectator. The handler additionally gates on `ezinfokey(world, "*cheats")` (Shape 4b cheat-mode gate, same family as `giveme`). Both corrections applied in draft.

**Source evidence**: `src/commands.c` (removeitem registration), `ezinfokey(world, "*cheats")` gate at handler.

**Recommendation**: Apply the corrected permission line + the Shape 4b cheat-gate framing.
