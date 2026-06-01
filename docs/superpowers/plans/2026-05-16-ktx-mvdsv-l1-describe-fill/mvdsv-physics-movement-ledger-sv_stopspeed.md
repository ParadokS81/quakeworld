# describe-fill-synthesis ledger -- mvdsv `sv_stopspeed`

- **project:** mvdsv
- **knob:** `sv_stopspeed` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_stopspeed: synthesized -- low-speed friction floor in PM_Friction/PM_SpectatorMove (control = max(speed, stopspeed)); server-global; KTX bot read only -- origin=synthesized ref=src/pmove.c:339 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> The low-speed floor for ground friction, working together with sv_friction. Once a player is moving slower than this speed, friction stops easing off and instead applies at constant full strength, so they brake to a clean complete stop instead of creeping. Above this speed, friction scales with actual speed as normal. Raising it makes players stop more crisply at low speed; lowering it lets them slide longer. It changes how the stop finishes, not the overall braking rate (that is sv_friction).
>
> Default: 100.
> Set by: server config.
> See also: sv_friction.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| below stopspeed friction uses stopspeed as control (harder stop) | src/pmove.c:339 | `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` | MATCH |
| that control drives the deceleration | src/pmove.c:340 | `drop = control * friction * pm_frametime;` | MATCH |
| above stopspeed friction scales with actual speed | src/pmove.c:339 | ternary false-branch yields `speed` | MATCH |
| same for spectators | src/pmove.c:830 | `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` (PM_SpectatorMove) | MATCH |
| server-global, not per-client | src/sv_phys.c:1125 | `movevars.stopspeed = sv_stopspeed.value;` (no per-client overwrite in sv_user.c:3791-3799) | MATCH |
| Default 100 (registered) | src/sv_phys.c:47 | `cvar_t sv_stopspeed = { "sv_stopspeed", "100"};` | MATCH |
| no KTX mechanism override | ktx/src/bot_movement.c:164 | `float stopspeed = cvar("sv_stopspeed");` (bot read only) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | file:line | Snippet | Verdict |
|---|--------|-----------|---------|---------|
| 1 | "Sets a minimum speed at which ground friction is applied at full strength" | src/pmove.c:339 | `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` (inside `else if (pmove.onground)` ground-friction branch, line 325) | MATCH (minor framing looseness: floor is on the `control` speed-term in the drop formula, not literally on friction "strength"; clause 2 clarifies precisely) |
| 2 | "When a player (or spectator) is moving slower than this, friction acts as though they were moving at this speed" | src/pmove.c:339 (player) + src/pmove.c:830 (spectator) | player: `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;`  /  spectator (PM_SpectatorMove): identical clamp at 830 | MATCH — spectator path verified, dispatched via PM_PlayerMove:908-909 (`PM_SPECTATOR \|\| PM_OLD_SPECTATOR -> PM_SpectatorMove`) |
| 3 | "so they decelerate harder and come to a stop more quickly" | src/pmove.c:339-340 | `control = ... stopspeed : speed;` then `drop = control * friction * pm_frametime;` | MATCH — below stopspeed, drop is the constant `stopspeed*friction*frametime`, larger than proportional `speed*friction*frametime`, so velocity removed per frame is greater -> faster stop |
| 4 | "Above this speed, friction scales with actual speed as normal" | src/pmove.c:339-340 | ternary yields `control = speed` when `speed >= stopspeed`, so `drop = speed * friction * frametime` | MATCH |
| 5 | "Raising it makes players stop more abruptly at low speeds; lowering it lets them coast longer" | src/pmove.c:339-340 | same drop formula; floor magnitude = stopspeed | MATCH — raising raises the constant low-speed drop (more abrupt); lowering shrinks the floor so proportional friction governs sooner (coasts) |
| 6 | "Default: 100" | src/sv_phys.c:47 | `cvar_t sv_stopspeed = { "sv_stopspeed", "100"};` (registered via Cvar_Register, sv_main.c:3512) | MATCH (WI-2: registered default in cvar_t initializer, not a shipped-cfg value) |
| 7 | "Set by: server config" | src/sv_phys.c:47 + src/sv_main.c:3512 | plain server-side physics `cvar_t`, no access flag; `Cvar_Register (&sv_stopspeed);` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

Enforcing mechanism: the classic Quake friction floor at pmove.c:339 (players, inside the `else if (pmove.onground)` ground-friction branch) and pmove.c:830 (PM_SpectatorMove). Both compute `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` then `drop = control * friction * pm_frametime;`. Below stopspeed, `control` is floored at stopspeed, giving a constant (speed-independent) deceleration; at/above stopspeed, drop scales with actual speed. Every behavioral clause maps to this exact pair of lines.

Data-flow: registered sv_phys.c:47 ("100") -> copied to movevars.stopspeed at sv_phys.c:1125 (SV_SetMoveVars) -> read at the two friction sites. Single assignment to movevars.stopspeed (no per-mode/cross-mod override anywhere in the tree). The two other hits (sv_user.c:450, sv_demo.c:1293) are pure serialization ("send the movevars" to client / demo), not enforcement.

Spectator inclusion (clause 2's "or spectator") verified: PM_PlayerMove:908-909 routes PM_SPECTATOR/PM_OLD_SPECTATOR to PM_SpectatorMove, which carries the identical floor at line 830 (spectator friction is unconditional once speed>=1, with friction *1.5; the stopspeed floor logic is the same). Description correctly scopes "ground friction" to players in clause 1 and separately notes spectators in clause 2 — no contradiction, since spec friction is not ground-gated.

Only residual is a still-true minor vagueness in clause 1's opening phrase ("minimum speed at which ground friction is applied at full strength") — the floor is on the `control` speed-term in the drop formula rather than literally on friction strength; the immediately following sentence ("friction acts as though they were moving at this speed") states the mechanism precisely. Traceable, acceptable -> TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_stopspeed",
  "type": "cvar",
  "description": "The low-speed floor for ground friction, working together with sv_friction. Once a player is moving slower than this speed, friction stops easing off and instead applies at constant full strength, so they brake to a clean complete stop instead of creeping. Above this speed, friction scales with actual speed as normal. Raising it makes players stop more crisply at low speed; lowering it lets them slide longer. It changes how the stop finishes, not the overall braking rate (that is sv_friction).\n\nDefault: 100.\nSet by: server config.\nSee also: sv_friction.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:339. Enforced in the player-move friction code, NOT at registration (src/sv_phys.c:47 is only a LOCATOR). Friction floor: src/pmove.c:339 (PM_Friction, ground branch) `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` followed by src/pmove.c:340 `drop = control * friction * pm_frametime;` -- so below stopspeed the deceleration uses stopspeed as the control value (harder stop), at/above it uses the actual speed (polarity + 'decelerate harder / stop more quickly' verified). Same logic for spectators at src/pmove.c:830 (PM_SpectatorMove), hence 'or spectator'. Source of the value: global bridge SV_SetMoveVars src/sv_phys.c:1125 `movevars.stopspeed = sv_stopspeed.value`; the per-client overwrite block at src/sv_user.c:3791-3799 does NOT touch movevars.stopspeed, so it is server-global (not per-client). Default 100 verified at registration literal src/sv_phys.c:47 `{ \"sv_stopspeed\", \"100\"}` (WI-2). F-MV1: KTX only reads it for bot movement prediction (ktx/src/bot_movement.c:164) -- does not override the friction mechanism. Set-by server config (registered cvar, no command handler).",
  "description_proposed": null
}
```
