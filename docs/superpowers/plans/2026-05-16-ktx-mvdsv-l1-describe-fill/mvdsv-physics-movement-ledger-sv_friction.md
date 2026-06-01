# describe-fill-synthesis ledger -- mvdsv `sv_friction`

- **project:** mvdsv
- **knob:** `sv_friction` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_friction: synthesized -- ground-only slowdown rate (src/pmove.c:340); higher=stops faster, doubles over a ledge, 0=keep speed, no air effect -- origin=synthesized ref=src/pmove.c:340 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how quickly a player slows down while standing or moving on the ground when not actively accelerating. A higher value brings players to a stop faster; a lower value makes them keep sliding. The slowdown is stronger near a ledge or dropoff (it doubles when the ground in front falls away). It has no effect in the air. At 0, players keep their ground speed indefinitely (no friction).
>
> Default: 4.
> Set by: server config.
> See also: sv_stopspeed.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 4 | src/sv_phys.c:58 | `cvar_t sv_friction = { "sv_friction", "4"};` | MATCH |
| value -> movevars bridge | src/sv_phys.c:1131 | `movevars.friction = sv_friction.value;` | MATCH |
| applies on ground (scope) | src/pmove.c:325-327 | `else if (pmove.onground) { ... friction = movevars.friction;` | MATCH |
| no effect in air | src/pmove.c:342-343 | `else { return; // in air, no friction }` | MATCH |
| higher = stops faster (magnitude) | src/pmove.c:340 | `drop = control * friction * pm_frametime;` | MATCH |
| slowdown applied to velocity | src/pmove.c:347-351 | `newspeed = speed - drop; ... VectorScale(pmove.velocity, newspeed, pmove.velocity);` | MATCH |
| doubles over a dropoff/ledge | src/pmove.c:335-336 | `if (trace.fraction == 1) { friction *= 2; }` | MATCH |
| 0 = no friction (OFF, keep speed) | src/pmove.c:340 | drop=0 when friction=0 -> newspeed unchanged | MATCH |
| below-stopspeed handling is sv_stopspeed | src/pmove.c:339 | `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;` | MATCH (excluded from this knob) |
| KTX does not override mechanism | ktx/src/bot_movement.c:165 | `float friction = cvar("sv_friction");` (read-only) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Controls ground friction / slowdown while standing or moving on ground | pmove.c:325-327, 340 | `else if (pmove.onground) { // apply ground friction` ... `friction = movevars.friction;` ... `drop = control * friction * pm_frametime;` | MATCH |
| 1b | "...when not actively accelerating" (conditional framing) | pmove.c:939 (PM_Friction called unconditionally, before PM_Accelerate) | `PM_Friction();` | MATCH (minor vagueness -- friction applies every frame unconditionally, not gated on "not accelerating"; the separation of friction vs accelerate steps makes this a reasonable user-level approximation, not a contradiction) |
| 2 | Higher = stops faster; lower = keeps sliding | pmove.c:340, 347 | `drop = control * friction * pm_frametime;` ... `newspeed = speed - drop;` | MATCH (drop scales linearly with friction; larger friction -> larger drop -> lower retained speed) |
| 3 | Slowdown doubles when ground in front falls away (ledge/dropoff) | pmove.c:329-337 | `// if the leading edge is over a dropoff, increase friction` ... traces 16 fwd / 34 down ... `if (trace.fraction == 1) { friction *= 2; }` | MATCH (trace.fraction==1 = nothing hit below the leading edge, i.e. dropoff; doubles friction) |
| 4 | No effect in the air | pmove.c:342-343 | `else { return; // in air, no friction }` | MATCH (exact -- comment confirms) |
| 5 | At 0, players keep ground speed indefinitely (no friction) | pmove.c:340, 347-348 | `drop = control * friction * pm_frametime;` ... `newspeed = speed - drop; newspeed = max(newspeed, 0);` | MATCH (friction=0 -> drop=0 -> newspeed=speed; speed preserved. Note: PM_Friction:309 still zeroes velocity when speed<1, independent of cvar value -- does not affect a moving player) |
| 6 | Default: 4 | sv_phys.c:58 | `cvar_t sv_friction = { "sv_friction", "4"};` | MATCH (registered default string "4"; cvar_t field order name/string/flags per cvar.h:68-70; WI-2 satisfied -- struct initializer, not cfg) |
| 7 | Set by: server config | sv_phys.c:58 (no flags); sv_main.c:3518 (Cvar_Register) | `{ "sv_friction", "4"}` (no CVAR_SERVERINFO/CVAR_ROM/user flag) ; `Cvar_Register (&sv_friction);` | MATCH (plain server cvar, no serverinfo broadcast, not client/cmdline-restricted -- server config/console) |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

CLASSIFICATION: TRACED-CLEAN. Every material clause (polarity, dropoff side-effect, air-scope, OFF-state, default, access-class) maps to a located, verified enforcing line plus adjacent comments. No flavour-C clause (nothing inferred from the knob name / enum / string with no enforcing read-site).

FULL TRACE CHAIN (followed callees per core rule):
- Registration: sv_phys.c:58 `cvar_t sv_friction = { "sv_friction", "4"}` (default "4", no flags). Registered at sv_main.c:3518.
- Load into movevars: sv_phys.c:1131 `movevars.friction = sv_friction.value;` (SV_SetMoveVars).
- ENFORCING site: pmove.c PM_Friction (lines 298-352), specifically the `else if (pmove.onground)` branch (325-340) -- this is where the cvar's value actually produces velocity decay. Called from PM_PlayerMove (pmove.c:939), invoked server-side from sv_user.c:3802. pmove.c is in the CMakeLists.txt server build -> enforcement is live, NOT runtime-dead.
- Network: movevars.friction is also MSG_WriteFloat'd to the client (sv_user.c:456) and into demo (sv_demo.c:1299) so client prediction matches server pmove. The authoritative enforcement is still server-side PM_Friction; the description correctly describes player-observable behavior.

CLAUSE 1 NUANCE (the only soft spot, accepted as minor traceable vagueness): "when not actively accelerating" implies friction is gated on the absence of acceleration. The code applies PM_Friction() every frame unconditionally (pmove.c:939), then runs PM_Accelerate separately. There is NO enforcing gate of the form "if not accelerating." However: (a) this is not a name/string/enum inference -- it derives from the real friction-vs-accelerate step separation; (b) it is not a contradiction of any enforcing line; (c) at user-doc altitude it is a defensible simplification (the net effect: decel dominates when input stops; accel can exceed friction when input is held). Per the V-pass enum, "still-true minor vagueness that was traceable is acceptable" -> remains TRACED-CLEAN. If a tightening were desired (not required): drop "when not actively accelerating" and say friction is the constant ground-decel force applied each frame. Not a blocker.

OTHER VERIFIED DETAILS:
- "doubles when the ground in front falls away" is exactly right: PM_Friction traces a point 16 units ahead of the leading edge and 34 units down; trace.fraction==1 (nothing hit) => friction *= 2 (pmove.c:336). Matches the source comment "if the leading edge is over a dropoff, increase friction".
- "no effect in the air" is verbatim-confirmed by the `return; // in air, no friction` comment (pmove.c:343).
- OFF-state at 0: drop=0 => speed unchanged. Correct. The independent speed<1 zeroing (pmove.c:309) is value-independent and does not contradict the "keep ground speed indefinitely" claim for a moving player.
- Default and access-class both WI-2 verified against the registered struct, not a shipped cfg.

OFF-SCOPE NOTE (not a defect in this row): sv_friction.value ALSO feeds PM_SpectatorMove (pmove.c:829: `friction = movevars.friction * 1.5; // extra friction`) -- spectator/fly camera movement uses 1.5x this cvar. The description scopes itself to "a player ... on the ground", which is the dominant/correct framing; the spectator-camera reuse is a separate behavior and its omission does not make any stated clause wrong. Flagged below as FYI for completeness.

## flags_for_review

- [fyi/off-scope-entity/vpass] sv_friction.value is reused for spectator/fly-camera movement at pmove.c:829 (PM_SpectatorMove): friction = movevars.friction * 1.5 (comment: 'extra friction'). The description correctly scopes to ground player friction and this omission invalidates no stated clause, but the cvar has a second consumer (spectator cam decel at 1.5x) not mentioned. FYI only -- not a defect in the player-friction row.
- [fyi/other/vpass] Friction physics is enforced in shared prediction code pmove.c (PM_Friction, called from PM_PlayerMove at sv_user.c:3802 server-side) and movevars.friction is also broadcast to clients (sv_user.c:456) and demos (sv_demo.c:1299). Confirmed pmove.c is in the CMakeLists.txt server build, so the enforcing line is live server-compiled code -- raised here only to document that the trace crossed the client/server-shared pmove boundary and resolved to a live server call site.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_friction",
  "type": "cvar",
  "description": "Controls how quickly a player slows down while standing or moving on the ground when not actively accelerating. A higher value brings players to a stop faster; a lower value makes them keep sliding. The slowdown is stronger near a ledge or dropoff (it doubles when the ground in front falls away). It has no effect in the air. At 0, players keep their ground speed indefinitely (no friction).\n\nDefault: 4.\nSet by: server config.\nSee also: sv_stopspeed.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:340. Registration src/sv_phys.c:58 cvar_t literal default \"4\". Value flows sv_friction.value -> movevars.friction at SV_SetMoveVars src/sv_phys.c:1131 (bridge runs src/sv_init.c:653). Enforcing read-site for ground friction: src/pmove.c:327 `friction = movevars.friction;` reached only in the `else if (pmove.onground)` branch (src/pmove.c:325) -- this is the 'on the ground' scope clause (the air branch src/pmove.c:342-343 `return; // in air, no friction` enforces 'no effect in the air'). Magnitude clause: src/pmove.c:340 `drop = control * friction * pm_frametime;` then src/pmove.c:347-351 newspeed = speed-drop scaled back into velocity -- higher friction -> larger drop -> faster slowdown. Ledge/dropoff clause: src/pmove.c:330-337 traces 34 units down at the leading edge; src/pmove.c:335-336 `if (trace.fraction == 1) { friction *= 2; }` doubles friction when nothing is below (over a dropoff). Comment src/pmove.c:329 confirms 'if the leading edge is over a dropoff, increase friction'. OFF-state (0 = keep speed): if speed<1 it is zeroed early (src/pmove.c:309-315) but that is a near-stationary clamp, not friction=0; with friction=0 on ground, drop=0 so newspeed=speed and velocity is unchanged (no slowdown) -- 'keep ground speed indefinitely'. NOTE: at speeds below sv_stopspeed the deceleration is computed as if at sv_stopspeed (src/pmove.c:339 `control = speed < movevars.stopspeed ? movevars.stopspeed : speed;`) -- that is sv_stopspeed's clause, not inlined here. Water uses sv_waterfriction (src/pmove.c:319), separate cvar. KTX F-MV1: ktx reads sv_friction only for bot prediction (bot_movement.c:165) and never Cvar_Set's it -- no mechanism override.",
  "description_proposed": null
}
```
