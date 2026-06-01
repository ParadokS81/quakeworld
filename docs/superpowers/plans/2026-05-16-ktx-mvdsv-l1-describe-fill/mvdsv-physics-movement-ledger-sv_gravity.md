# describe-fill-synthesis ledger -- mvdsv `sv_gravity`

- **project:** mvdsv
- **knob:** `sv_gravity` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_gravity: synthesized -- per-frame downward accel on airborne players/objects (src/pmove.c:537); higher=fall faster/shorter jumps, 0=no fall -- origin=synthesized ref=src/pmove.c:537 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the downward acceleration pulling airborne players and objects toward the ground each second. A higher value makes things fall faster and jumps shorter and flatter; a lower value gives floatier, longer jumps. At 0, players and objects do not fall.
>
> Default: 800.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 800 | src/sv_phys.c:46 | `cvar_t sv_gravity = { "sv_gravity", "800"};` | MATCH |
| value -> movevars bridge | src/sv_phys.c:1124 | `movevars.gravity = sv_gravity.value;` | MATCH |
| downward accel per frame (airborne) | src/pmove.c:537 | `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime;` | MATCH |
| also applied on ground when slidefix | src/pmove.c:517 | `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime;` | MATCH |
| polarity = pull down (subtract from z) | src/pmove.c:537 | `velocity[2] -=` (z-up convention) | MATCH |
| 0 = no fall (OFF) | src/pmove.c:537 | delta=0 when gravity=0 | MATCH |
| entgravity is a separate per-player scalar | src/sv_user.c:3789 | `movevars.entgravity = sv_client->entgravity;` | MATCH (excluded from this knob) |
| KTX value-set, not mechanism override | ktx/src/world.c:197-209 | `trap_cvar_set("sv_gravity", "100"/"150"/"800");` | MATCH (case a) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Sets the downward acceleration pulling airborne players and objects toward the ground each second" (polarity = downward; unit = acceleration/sec) | pmove.c:517,537 (players); sv_phys.c:379 (objects); pmove.c:896 / sv_user.c:3726 (frametime in seconds) | `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime;` ; `ent->v->velocity[2] -= scale * movevars.gravity * sv_frametime;` ; `pm_frametime = pmove.cmd.msec * 0.001;` | MATCH — Z (index 2) is vertical (cf. `wishvel[2] += pmove.cmd.upmove`); value is SUBTRACTED from vertical velocity = downward; multiplied by frametime(sec) so units are accel/s². "each second" is loose but substantively correct (traceable minor vagueness). |
| 2 | "A higher value makes things fall faster and jumps shorter and flatter" | pmove.c:517,537; sv_phys.c:379 | `pmove.velocity[2] -= ... movevars.gravity * pm_frametime;` | MATCH — larger gravity → larger per-frame downward velocity decrement → faster fall / lower apex. Monotonic consequence of the multiplication, enforced arithmetically (not name-inferred). |
| 3 | "a lower value gives floatier, longer jumps" | pmove.c:517,537; sv_phys.c:379 | same as #2 | MATCH — inverse of #2 at the same enforcing lines. |
| 4 | "At 0, players and objects do not fall" (OFF-state) | pmove.c:517,537; sv_phys.c:379 | `... -= movevars.entgravity * movevars.gravity * pm_frametime;` | MATCH — gravity=0 → decrement is 0 → no downward pull applied to vertical velocity, for both player and object paths. User-facing "do not fall" = nothing pulls them down; accurate for the gravity contribution. |
| 5 | "Default: 800" | sv_phys.c:46 (registration struct) -> cvar.c:267-269 (Cvar_Register uses `->string` as default) ; sv_main.c:3511 (Cvar_Register call) | `cvar_t sv_gravity = { "sv_gravity", "800"};` ; `value = variable->string; ... Cvar_SetROM (variable, value);` | MATCH — `"800"` is the registered default (the struct's `string` field consumed by Cvar_Register), NOT a shipped-cfg value. WI-2 satisfied. |
| 6 | "Set by: server config" (scope = server-side cvar) | sv_main.c:3392,3511 (registered in SV_InitLocal); sv_phys.c:46 (no flags); sv_phys.c:1124 (server reads into movevars) | `extern cvar_t sv_gravity;` / `Cvar_Register (&sv_gravity);` ; struct has no `CVAR_SERVERINFO`/`CVAR_ROM` flag (flags field = 0 = CVAR_NONE) ; `movevars.gravity = sv_gravity.value;` | MATCH — plain server-side cvar, registered server-side, no serverinfo mirroring/ROM. Settable from server config/console. Consistent with "server config". |

**V-pass notes:** Full enforcement chain traced: sv_gravity.value -> movevars.gravity (sv_phys.c:1124, SV_SetMoveVars) -> consumed at two enforcing classes of site: (a) PLAYER physics pmove.c:517 (onground+slidefix) and pmove.c:537 (airborne), `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime`; (b) OBJECT physics sv_phys.c:379 SV_AddGravity `ent->v->velocity[2] -= scale * movevars.gravity * sv_frametime`, called from SV_Physics_Toss (sv_phys.c:744, tossed items/gibs/backpacks) and SV_Physics_Step (sv_phys.c:812, stepping/freefalling objects), both gated to exclude FLY/FLYMISSILE/SWIM movetypes.

All 6 clauses map to located, verified enforcing lines (not name/string/enum inference). Polarity is enforced by the `-=` against vertical velocity[2] at both player and object sites; magnitude monotonicity (#2/#3) and OFF-state (#4) follow arithmetically from the same multiplications. Default 800 is the registered struct default per WI-2 (cvar.c:267-269 consumes ->string). Scope is a plain server cvar (no CVAR_SERVERINFO/ROM flags, registered in SV_InitLocal server-side).

Two minor wording observations, both traceable-and-still-true (do not lift to NEAR-MISS):
- "each second" describes gravity as accel/s²; the integration `Δv = gravity * Δt` confirms this, so the framing is substantively right though loosely worded.
- The player path also multiplies by movevars.entgravity (per-entity gravity multiplier, default 1.0 at sv_phys.c:1133; can be scaled per-player via the `.gravity` edict field / svc_entgravity). The description uses base-cvar framing ("Sets the downward acceleration"), which is correct by default since entgravity defaults to 1.0; sv_gravity is the base/effective value. Not a contradiction — see flag below for FYI.

## flags_for_review

- [fyi/off-scope-entity/vpass] The PLAYER gravity enforcing line (pmove.c:517,537) is `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime` -- effective player gravity = sv_gravity * entgravity, where entgravity is a per-player multiplier (movevars.entgravity default 1.0 at sv_phys.c:1133; per-client value carried via sv_client->entgravity from the edict `.gravity` field, sv_user.c:888/3792, transmitted as svc_entgravity). The OBJECT path (SV_AddGravity, sv_phys.c:379) uses only sv_gravity (no entgravity). The proposed description's base-cvar framing is correct by default but does not surface that mods/QC can scale per-player gravity independently of sv_gravity. FYI only -- not a defect in the description, which is scoped to the cvar itself.
- [fyi/suspected-bug/vpass] sv_user.c:458 carries an in-source FIXME on entgravity transmission: `MSG_WriteFloat(..., /* sv_client->entgravity */ movevars.entgravity); // FIXME: this does't work, Tonik?` -- a developer-flagged uncertainty about per-client entgravity in the prediction/userinfo path. Off-scope for sv_gravity's own behavior (sv_gravity itself traces cleanly) but noting the adjacent known-rough code per trace-discipline.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_gravity",
  "type": "cvar",
  "description": "Sets the downward acceleration pulling airborne players and objects toward the ground each second. A higher value makes things fall faster and jumps shorter and flatter; a lower value gives floatier, longer jumps. At 0, players and objects do not fall.\n\nDefault: 800.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:537. Registration src/sv_phys.c:46 cvar_t literal default \"800\". Value flows sv_gravity.value -> movevars.gravity at SV_SetMoveVars src/sv_phys.c:1124 (bridge runs src/sv_init.c:653). Enforcing read-site: src/pmove.c:537 `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime;` in the airborne (`else` not-onground) branch of PM_AirMove -- this is the per-frame downward acceleration ('falls faster when higher', '0 = no fall'). A parallel application exists on the ground when slidefix is on: src/pmove.c:517 `pmove.velocity[2] -= movevars.entgravity * movevars.gravity * pm_frametime;`. Polarity: subtraction from velocity[2] (z-up) = downward pull; larger gravity -> larger downward delta -> shorter/flatter jump arc. OFF-state: gravity=0 -> delta 0 -> no fall. The `movevars.entgravity` factor is a SEPARATE per-player gravity multiplier (src/sv_user.c:3789 movevars.entgravity = sv_client->entgravity; global default 1.0 at src/sv_phys.c:bridge); it scales but is not this cvar, so it is deliberately not described here (not in scope). KTX F-MV1: this is the documented case (a) value-set, NOT a mechanism override -- ktx/src/world.c:197-209 SP_worldspawn runs trap_cvar_set(\"sv_gravity\", ...) to 100 on e1m8.bsp, 150 on bunmoo3/lowgrav, else 800; that only changes the VALUE the MVDSV engine integrates at src/pmove.c:537, the engine still governs the fall mechanism. KTX bot files reference sv_gravity only in trajectory math/comments (bot_movement.c:201, bot_bothazd.c). No mechanism replacement -- document engine behavior normally.",
  "description_proposed": null
}
```
