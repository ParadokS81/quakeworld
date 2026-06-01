# describe-fill-synthesis ledger -- mvdsv `sv_accelerate`

- **project:** mvdsv
- **knob:** `sv_accelerate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_accelerate: synthesized -- ground accel rate via PM_Accelerate; higher=faster gain, 0=none, top speed unaffected -- origin=synthesized ref=src/pmove.c:367 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how quickly a player gains speed toward the direction they are moving on the ground -- and, on this server, also their airborne acceleration (the air path is heavily limited), since sv_airaccelerate has no server-side effect. A higher value makes players reach full running speed almost instantly; a lower value makes them ramp up more gradually. It does not change the top speed a player can reach (that is sv_maxspeed) -- only how fast that speed is gained. At 0, players gain no speed from moving.
>
> Default: 10.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 10 | src/sv_phys.c:50 | `cvar_t sv_accelerate = { "sv_accelerate", "10"};` | MATCH |
| value -> movevars bridge | src/sv_phys.c:1128 | `movevars.accelerate = sv_accelerate.value;` | MATCH |
| bridge runs (movevars live) | src/sv_init.c:653 | `SV_SetMoveVars();` | MATCH |
| ground accel toward input; higher=faster gain | src/pmove.c:367 | `accelspeed = accel * pm_frametime * wishspeed;` | MATCH |
| gain capped at remaining gap | src/pmove.c:368-369 | `if (accelspeed > addspeed) accelspeed = addspeed;` | MATCH |
| accel applied on ground | src/pmove.c:515 / src/pmove.c:521 | `PM_Accelerate(wishdir, wishspeed, movevars.accelerate);` | MATCH |
| 0 = no speed gained (OFF) | src/pmove.c:371 | `VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity);` (accelspeed=0 when accel=0) | MATCH |
| top speed is sv_maxspeed, not this | src/pmove.c:507-509 | `if (wishspeed > movevars.maxspeed) { ... wishspeed = movevars.maxspeed; }` | MATCH |
| KTX does not override mechanism | ktx/src/bot_commands.c:2658 | `sv_accelerate = cvar("sv_accelerate");` (read-only bot math) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Polarity: higher value = reach speed faster, lower = ramp gradually | pmove.c:367 (PM_Accelerate) | `accelspeed = accel * pm_frametime * wishspeed;` | MATCH -- accel (=sv_accelerate via movevars.accelerate, sv_phys.c:1128) is a direct multiplier on the per-frame speed increment; larger accel => larger accelspeed => faster approach to wishspeed. |
| 2 | Scope: effect is "while on the ground" | pmove.c:512-522 (PM_AirMove ground branch) AND pmove.c:534 (PM_AirAccelerate, air branch) | ground: `if (pmove.onground) { ... PM_Accelerate(wishdir, wishspeed, movevars.accelerate); }`  air: `// not on ground, so little effect on velocity` `PM_AirAccelerate(wishdir, wishspeed, movevars.accelerate);` | MISMATCH (imprecision) -- ground framing is correct and dominant, but the SAME cvar also feeds the air-acceleration path (PM_AirAccelerate, pmove.c:382-430, where wishspeed is hard-capped at 30, line 395). "While on the ground" implies exclusivity the air reuse contradicts. Also feeds PM_FlyMove (pmove.c:481, fly/noclip only). |
| 3 | Direction: speed gained "toward the direction they are moving" | pmove.c:363,371 (PM_Accelerate) | `currentspeed = DotProduct(pmove.velocity, wishdir);` ... `VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity);` | MATCH -- wishdir is the normalized desired movement direction (VectorNormalize at pmove.c:504); velocity is pushed along wishdir. |
| 4 | Does NOT change top speed; that is sv_maxspeed; only rate of gain | pmove.c:507-510 (clamp) + pmove.c:364-369 (cap) | `if (wishspeed > movevars.maxspeed) { ...; wishspeed = movevars.maxspeed; }` then `addspeed = wishspeed - currentspeed; if (addspeed <= 0) return; ...; if (accelspeed > addspeed) accelspeed = addspeed;` | MATCH -- wishspeed is clamped to movevars.maxspeed (=sv_maxspeed.value, sv_phys.c:1126) BEFORE accel is applied; accelspeed is capped at addspeed = wishspeed - currentspeed, so accel sets the rate, maxspeed sets the ceiling. |
| 5 | At 0, players gain no speed from moving | pmove.c:367,371 (ground) + pmove.c:413,416 (air) | `accelspeed = accel * pm_frametime * wishspeed;` `VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity);` | MATCH -- accel=0 => accelspeed=0 => VectorMA adds zero in BOTH PM_Accelerate and PM_AirAccelerate. The absolute "no speed from moving" is actually true for ground AND air at 0. |
| 6 | Default: 10 | sv_phys.c:50 (registration) | `cvar_t sv_accelerate = { "sv_accelerate", "10"};` | MATCH -- registered default literal is "10" (WI-2 satisfied; not a shipped-cfg value). |
| 7 | Set by: server config | sv_phys.c:50 + sv_main.c:3515 (Cvar_Register) | `cvar_t sv_accelerate = { "sv_accelerate", "10"};` / `Cvar_Register (&sv_accelerate);` | MATCH -- plain cvar, no CVAR_SERVERINFO / CVAR_ROM / archive/user flag; server-side, set via server console/config. |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Wide-grep found 4 sv_accelerate sites (registration sv_phys.c:50, value-load sv_phys.c:1128, extern + Cvar_Register in sv_main.c); value flows sv_accelerate.value -> movevars.accelerate -> pmove.c. Followed every callee into PM_Accelerate (354) and PM_AirAccelerate (382), not just the call sites.

Classification: C-NEAR-MISS. Six of seven clauses (polarity, direction, top-speed-independence/sv_maxspeed, OFF-state, default 10, set-by server config) trace to verified enforcing lines and MATCH exactly. The one imprecise clause is SCOPE ("while on the ground"): sv_accelerate is the ground-acceleration value AND the same cvar is reused for air acceleration at pmove.c:534 (PM_AirAccelerate, which hard-caps wishspeed at 30, line 395) and for fly/noclip mode at pmove.c:481. The ground framing captures the dominant, intended, user-facing effect, and the engine author's own comment (pmove.c:533 "not on ground, so little effect on velocity") treats air as the minor case -- but "while on the ground" implies an exclusivity the air-path reuse contradicts. This is the k_teamoverlay precedent: a scope clause correct for the primary case but not enforcement-exhaustive. It is NOT a C-FIX because the ground branch genuinely uses sv_accelerate exactly as described -- nothing asserted is contradicted at the ground enforcing line; the defect is omission of the air-path reuse, not an inverted/wrong assertion.

Disambiguation guarded: line 875 (accelspeed = movevars.accelerate * ...) is inside PM_SpectatorMove (816+), keyed to spectatormaxspeed -- NOT the player ground path, so it is not a separate enforcement of the player-facing behavior. Water movement uses sv_wateraccelerate (PM_WaterMove, pmove.c:457), NOT sv_accelerate, so the description correctly omits water (different cvar, no contradiction).

Suggested minimal fix for the scope clause: soften "while on the ground" to acknowledge it is primarily the ground-acceleration rate and that the same value also drives the (heavily limited) air-acceleration path -- or keep the ground framing but drop the implied exclusivity. Either keeps the description honest without losing the user-facing primary effect.

## flags_for_review

- [review/suspected-bug/vpass] sv_accelerate feeds three distinct movement paths via the single movevars.accelerate value: ground (PM_Accelerate, pmove.c:515/521), air (PM_AirAccelerate, pmove.c:534, wishspeed hard-capped at 30 line 395), and fly/noclip mode (PM_FlyMove, pmove.c:481). A purely ground-scoped description omits the air-accel reuse. Sibling cvar sv_airaccelerate (sv_phys.c:51, also default 10) exists and is registered but its movevars.airaccelerate field is NOT passed to PM_AirAccelerate at the call site -- pmove.c:534 passes movevars.accelerate, not movevars.airaccelerate. This means sv_airaccelerate may be inert in the air path (its value is loaded at sv_phys.c:1129 but the air-accel call uses .accelerate). Flagging as a possible cross-cvar wiring anomaly for separate review when sv_airaccelerate is described -- it could be runtime-dead in the air-movement path, or consumed elsewhere I did not exhaustively trace for that cvar.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_accelerate",
  "type": "cvar",
  "description": "Controls how quickly a player gains speed toward the direction they are moving on the ground -- and, on this server, also their airborne acceleration (the air path is heavily limited), since sv_airaccelerate has no server-side effect. A higher value makes players reach full running speed almost instantly; a lower value makes them ramp up more gradually. It does not change the top speed a player can reach (that is sv_maxspeed) -- only how fast that speed is gained. At 0, players gain no speed from moving.\n\nDefault: 10.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:367. Registration src/sv_phys.c:50 cvar_t literal default \"10\". Value flows sv_accelerate.value -> movevars.accelerate at SV_SetMoveVars src/sv_phys.c:1128 (called per-spawn src/sv_init.c:653; movevars consumed each player-move). Enforcing read-site: PM_Accelerate src/pmove.c:367 `accelspeed = accel * pm_frametime * wishspeed` with the rate-of-gain clamp src/pmove.c:368-369 `if (accelspeed > addspeed) accelspeed = addspeed` (caps the gain at the remaining gap to wishspeed) -- this is the 'speeds up toward input direction' + 'reaches full speed faster when higher' clause. PM_Accelerate is invoked with movevars.accelerate from ground move src/pmove.c:515 (slidefix) and src/pmove.c:521 (non-slidefix), water move src/pmove.c:457 uses wateraccelerate (separate cvar, not this one), fly move src/pmove.c:481. OFF-state (0 = no gain): at accel=0 accelspeed=0 so VectorMA adds nothing (src/pmove.c:371). 'Does not change top speed' clause: top speed is the wishspeed clamp to movevars.maxspeed at src/pmove.c:507-509, independent of accel. KTX F-MV1: ktx reads sv_accelerate only for bot trajectory math (bot_commands.c:2658, bot_movement.c) and never Cvar_Set's it -- no mechanism override; engine cvar governs. NOTE (cross-knob, action-relevant): in MVDSV's server pmove this same value also drives AIR acceleration -- PM_AirAccelerate is called with movevars.accelerate at src/pmove.c:534, NOT with movevars.airaccelerate; not stated in the user prose to avoid over-documenting, captured in the sv_airaccelerate flag.",
  "description_proposed": null
}
```
