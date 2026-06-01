# describe-fill-synthesis ledger -- mvdsv `sv_wateraccelerate`

- **project:** mvdsv
- **knob:** `sv_wateraccelerate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_wateraccelerate: synthesized -- swimming accel rate fed to PM_Accelerate in PM_WaterMove (0=no gain, linear, capped by wishspeed); server-global; no KTX override -- origin=synthesized ref=src/pmove.c:457 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how quickly a player speeds up while swimming toward the direction they are moving. A higher value makes a swimming player reach full underwater speed faster; a lower value makes them ramp up more gradually. It is the in-water counterpart to sv_accelerate and does not change the maximum swimming speed (which is governed by sv_maxspeed). At 0, a swimming player gains no speed from moving.
>
> Default: 10.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| used as the swimming accel rate | src/pmove.c:457 | `PM_Accelerate(wishdir, wishspeed, movevars.wateraccelerate);` (in PM_WaterMove) | MATCH |
| higher value = faster ramp; linear in accel | src/pmove.c:367 | `accelspeed = accel * pm_frametime * wishspeed;` | MATCH |
| 0 = no speed gained | src/pmove.c:367,371 | accelspeed=0 -> `VectorMA(...,0,...)` adds nothing | MATCH |
| does not raise the swim top speed | src/pmove.c:450,368 | wishspeed capped by movevars.maxspeed; accelspeed capped by addspeed | MATCH |
| server-global, not per-client | src/sv_phys.c:1130 | `movevars.wateraccelerate = sv_wateraccelerate.value;` (no per-client overwrite in sv_user.c:3791-3799) | MATCH |
| Default 10 (registered) | src/sv_phys.c:57 | `cvar_t sv_wateraccelerate = { "sv_wateraccelerate", "10"};` | MATCH |
| no KTX override | ktx/src (grep) | zero references to sv_wateraccelerate | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Controls how quickly a player speeds up while swimming toward the direction they are moving | pmove.c:457 (-> PM_Accelerate pmove.c:363-371; reached only via PM_WaterMove, gated waterlevel>=2 at pmove.c:941-942) | `PM_Accelerate(wishdir, wishspeed, movevars.wateraccelerate);` / `currentspeed = DotProduct(pmove.velocity, wishdir); ... VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity);` | MATCH |
| 2 | Higher value -> reach full underwater speed faster; lower -> ramp up more gradually | pmove.c:367-369 | `accelspeed = accel * pm_frametime * wishspeed; if (accelspeed > addspeed) accelspeed = addspeed;` | MATCH |
| 3 | In-water counterpart to sv_accelerate | sv_phys.c:50 + sv_phys.c:1128 vs sv_phys.c:57 + sv_phys.c:1130; both consumed by same PM_Accelerate (pmove.c:481 vs 457) | `cvar_t sv_accelerate = {"sv_accelerate","10"};` / `movevars.wateraccelerate = sv_wateraccelerate.value;` | MATCH |
| 4a | does not change the maximum swimming speed | pmove.c:450-454 (cap set on wishspeed) + pmove.c:365 (`addspeed<=0` guard prevents exceeding wishspeed); accel absent from cap | `if (wishspeed > movevars.maxspeed){...wishspeed = movevars.maxspeed;} wishspeed *= 0.7;` / `addspeed = wishspeed - currentspeed; if (addspeed <= 0) return;` | MATCH |
| 4b | the maximum swimming speed "is sv_maxspeed" | pmove.c:450-454 (cap = movevars.maxspeed = sv_maxspeed.value @ sv_phys.c:1126, THEN *0.7) | `wishspeed = movevars.maxspeed; ... wishspeed *= 0.7;` | MISMATCH (governing cvar is sv_maxspeed, but achievable underwater cap = sv_maxspeed * 0.7, not sv_maxspeed) |
| 5 | At 0, a swimming player gains no speed from moving | pmove.c:367,371 | `accelspeed = accel * pm_frametime * wishspeed;` (accel=0 -> accelspeed=0) / `VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity);` (adds 0) | MATCH |
| 6 | Default: 10 | sv_phys.c:57 (registered, sv_main.c:3517, no OnChange/clamp) | `cvar_t sv_wateraccelerate = { "sv_wateraccelerate", "10"};` | MATCH |
| 7 | Set by: server config | sv_phys.c:57 (no CVAR_SERVERINFO/USERINFO flag) | `{ "sv_wateraccelerate", "10"}` (empty flags field) | MATCH |

**V-pass notes:** Full chain traced: register sv_phys.c:57 (default "10", no flags, no OnChange) -> Cvar_Register sv_main.c:3517 -> SV_SetMoveVars copies to movevars.wateraccelerate sv_phys.c:1130 -> sole consumer pmove.c:457 inside PM_WaterMove (the only swimming path, gated `pmove.waterlevel >= 2` at pmove.c:941-942) -> PM_Accelerate pmove.c:354-372. movevars.wateraccelerate has exactly one read-site; not used by PM_FlyMove or PM_AirMove (those use movevars.accelerate). pmove.c is shared client/server prediction code but the value originates server-side only.

Six of seven clauses MATCH at their enforcing lines including polarity (clause 2), the OFF-state (clause 5: accel=0 -> zero acceleration contribution), default (WI-2 verified against the registered initializer, not a shipped cfg), and scope. The single soft clause is the parenthetical in clause 4: "does not change the maximum swimming speed (that is sv_maxspeed)". The primary assertion -- wateraccelerate does NOT change the max -- is fully correct and traced (the cap lives on wishspeed at pmove.c:450-454, independent of the accel argument, with the addspeed<=0 guard at pmove.c:365 preventing overshoot). The imprecision is the attribution "(that is sv_maxspeed)": the governing cvar is indeed sv_maxspeed (movevars.maxspeed at pmove.c:450-452 = sv_maxspeed.value), but PM_WaterMove then applies a hardcoded `wishspeed *= 0.7` at pmove.c:454, so the actual achievable top swim speed is sv_maxspeed * 0.7, not the raw sv_maxspeed value. A reader would infer "swim cap = sv_maxspeed value," which is materially off by the 70% water factor. Per the discipline ("the real code is narrower / more conditional than implied"), this is C-NEAR-MISS, not C-FIX -- it is an aside identifying the right governing cvar, and the knob's own behavior (clauses 1,2,5) is fully correct. Suggested tightening: drop the value-equality implication, e.g. "does not change the maximum swimming speed (which is governed by sv_maxspeed)" -- or, if precision is wanted, note the underwater cap is 70% of sv_maxspeed.

## flags_for_review

- [review/contradiction/vpass] PM_WaterMove (pmove.c:454) applies a hardcoded `wishspeed *= 0.7` AFTER clamping wishspeed to movevars.maxspeed (sv_maxspeed). The achievable maximum underwater movement speed is therefore sv_maxspeed * 0.7, not sv_maxspeed. The proposed description's parenthetical 'maximum swimming speed (that is sv_maxspeed)' implies value-equality with sv_maxspeed and omits the 0.7 water factor. This same 0.7 multiplier is NOT present in PM_FlyMove (pmove.c:476-479) or PM_AirMove, so it is water-specific. Worth a consistency check if sv_maxspeed's own description claims it sets the swim cap directly.
- [fyi/other/vpass] sv_wateraccelerate has no value clamp or OnChange handler -- negative values are not rejected at registration. A negative accel would make PM_Accelerate's accelspeed negative (pmove.c:367), but the addspeed<=0 early-return (pmove.c:365) and the accelspeed>addspeed clamp (pmove.c:368) mean a negative accel yields no forward acceleration (effectively same as 0 for the player-intended direction). Not a defect in the description (which only documents the >=0 range and the 0 case), noted for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_wateraccelerate",
  "type": "cvar",
  "description": "Controls how quickly a player speeds up while swimming toward the direction they are moving. A higher value makes a swimming player reach full underwater speed faster; a lower value makes them ramp up more gradually. It is the in-water counterpart to sv_accelerate and does not change the maximum swimming speed (which is governed by sv_maxspeed). At 0, a swimming player gains no speed from moving.\n\nDefault: 10.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:457. Enforced in the player water-move code, NOT at registration (src/sv_phys.c:57 is only a LOCATOR). PM_WaterMove passes it as the acceleration rate: src/pmove.c:457 `PM_Accelerate(wishdir, wishspeed, movevars.wateraccelerate);`. The rate semantics (higher = faster ramp; 0 = no gain): PM_Accelerate src/pmove.c:367 `accelspeed = accel * pm_frametime * wishspeed;` then src/pmove.c:371 `VectorMA(pmove.velocity, accelspeed, wishdir, pmove.velocity)` -- accelspeed is linear in `accel`, so 0 yields no velocity add ('gains no speed'), larger yields faster approach; capped by `addspeed` at src/pmove.c:368-369 so it never overshoots the wishspeed (does NOT raise top speed -- the water wishspeed cap is movevars.maxspeed at src/pmove.c:450, hence the 'does not change the maximum swimming speed' clause). Source of value: global bridge SV_SetMoveVars src/sv_phys.c:1130 `movevars.wateraccelerate = sv_wateraccelerate.value`; the per-client overwrite block src/sv_user.c:3791-3799 does NOT touch it, so it is server-global. Default 10 verified at registration literal src/sv_phys.c:57 `{ \"sv_wateraccelerate\", \"10\"}` (WI-2). F-MV1: zero references in ktx/src -- not overridden. Set-by server config (registered cvar, no command handler).",
  "description_proposed": null
}
```
