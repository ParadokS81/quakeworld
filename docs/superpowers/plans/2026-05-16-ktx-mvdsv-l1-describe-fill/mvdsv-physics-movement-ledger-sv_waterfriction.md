# describe-fill-synthesis ledger -- mvdsv `sv_waterfriction`

- **project:** mvdsv
- **knob:** `sv_waterfriction` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_waterfriction: synthesized -- underwater (waterlevel>=2) velocity decay rate; higher=faster slowdown; 0=no water friction; KTX only mirrors it for bot sim -- origin=synthesized ref=src/pmove.c:319 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how quickly a player slows down while submerged in water. A higher value bleeds off underwater speed faster; a lower value lets a player coast through water longer. The effect only applies when the player is at least chest/head deep -- shallow wading is unaffected. At 0, water applies no slowdown of its own.
>
> Default: 4.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value governs water decel (global, not per-client) | src/sv_phys.c:1132 | `movevars.waterfriction = sv_waterfriction.value;` | MATCH |
| per-client fill does not overwrite this field | src/sv_user.c:3792-3799 | block sets entgravity/maxspeed/bunnyspeedcap/ktjump/slidefix/airstep/pground/rampjump only | MATCH |
| enforcing read-site; higher=faster slowdown | src/pmove.c:319 | `drop = speed * movevars.waterfriction * pmove.waterlevel * pm_frametime;` | MATCH |
| applies only when at least chest/head submerged | src/pmove.c:317 | `if (pmove.waterlevel >= 2) {` | MATCH |
| drop reduces velocity (polarity) | src/pmove.c:347-351 | `newspeed = speed - drop; ... VectorScale(pmove.velocity, newspeed, pmove.velocity);` | MATCH |
| default 4 | src/sv_phys.c:59 | `cvar_t sv_waterfriction = { "sv_waterfriction", "4"};` | MATCH |
| KTX reads value (bot sim), not an override | ktx/src/bot_movement.c:157,159 | `float waterfriction = cvar("sv_waterfriction"); ... drop = vel_length * waterfriction * self->s.v.waterlevel * g_globalvars.frametime;` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Controls how quickly a player slows down while submerged in water (friction on underwater speed) | pmove.c:319 (+347-351) | `drop = speed * movevars.waterfriction * pmove.waterlevel * pm_frametime;` ... `newspeed = speed - drop;` ... `VectorScale(pmove.velocity, newspeed, pmove.velocity);` | MATCH |
| 2 | Higher value bleeds off speed faster; lower value coasts longer (polarity) | pmove.c:319,347 | `drop = speed * movevars.waterfriction * pmove.waterlevel * pm_frametime;` then `newspeed = speed - drop;` -- drop is directly proportional to waterfriction, so higher -> more speed removed | MATCH |
| 3 | Effect only applies when at least chest/head deep; shallow wading unaffected (scope/threshold) | pmove.c:317 (gate) + pmove.c:647-665 (waterlevel definition) | gate: `if (pmove.waterlevel >= 2) {` ; level set: `waterlevel=1` at `origin[2]+player_mins[2]+1` (feet), `waterlevel=2` at `origin[2]+(player_mins[2]+player_maxs[2])*0.5` (bbox midpoint), `waterlevel=3` at `origin[2]+22`. Water friction requires lvl>=2; lvl1 (feet) falls through to ground/air friction | MATCH (minor imprecision -- see notes) |
| 4 | At 0, water applies no slowdown of its own (OFF-state) | pmove.c:317-344 | when `waterlevel>=2` the `if/else if/else` makes the water branch exclusive; with waterfriction=0, `drop = speed*0*waterlevel*pm_frametime = 0` -> `newspeed=speed`, no slowdown. "Of its own" is precise: ground/fly friction is also suppressed while submerged | MATCH |
| 5 | Default: 4 | sv_phys.c:59 | `cvar_t sv_waterfriction = { "sv_waterfriction", "4"};` -- no OnChange, no clamp, no other write to .value | MATCH |
| 6 | Set by: server config | sv_phys.c:59 ; sv_main.c:3519 | registration carries NO flags (no CVAR_SERVERINFO, unlike neighbours pm_ktjump/sv_antilag); `Cvar_Register (&sv_waterfriction);` inside server-only block. Plain server physics cvar, set via server console/config | MATCH |

**V-pass notes:** All six clauses enforcement-traced to located lines; classification TRACED-CLEAN.

Value flow: sv_waterfriction.value (sv_phys.c:59) -> movevars.waterfriction via SV_SetMoveVars (sv_phys.c:1132, called from sv_init.c:653) -> consumed at the friction enforcement pmove.c:319 inside PM_Friction (the function comment at pmove.c:298 reads "Handles both ground friction and water friction", confirming the semantic). Also MSG_WriteFloat'd to clients (sv_user.c:457) and demos (sv_demo.c:1300) for physics parity -- that is transmission, not a separate behavior, so it does not affect any clause.

OFF-state (clause 4) verified at the exclusive if/else-if/else structure pmove.c:317-344: when waterlevel>=2 ONLY the water branch runs; at value 0 drop=0 and other friction is suppressed, so "no slowdown of its own" is the precise framing.

Polarity, default, and OFF-state are exact. No OnChange handler and no clamp exist on the cvar (grep returned empty), so the registered "4" is the live default with no narrowing.

Single minor imprecision (does NOT rise to C-NEAR-MISS because it is still-true vagueness that I fully enforcement-traced, not an unenforced inference): the description says "at least chest/head deep". The actual trigger is waterlevel>=2, whose level-2 sample point (pmove.c:655) is the bounding-box VERTICAL MIDPOINT, conventionally "waist-deep" in Quake physics; "head deep" corresponds to level 3 (a stricter condition than the gate requires). As a lower bound "at least chest" is approximately right and the OR-phrasing ("chest/head") covers the real trigger, and the load-bearing half of the clause -- feet-only wading (level 1) is unaffected -- is exactly correct. So the scope clause is substantively right with a slightly loose body-height label. Per the discipline this is acceptable TRACED-CLEAN vagueness. A tightening to "waist-deep or deeper" would be more precise if a copy-edit pass is wanted.

Undocumented-but-not-contradicted detail: line 319 multiplies drop by pmove.waterlevel itself, so friction also scales with depth (level 3 removes more than level 2). The description makes no depth-independence claim, so this is not a defect -- noted only for completeness.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_waterfriction",
  "type": "cvar",
  "description": "Controls how quickly a player slows down while submerged in water. A higher value bleeds off underwater speed faster; a lower value lets a player coast through water longer. The effect only applies when the player is at least chest/head deep -- shallow wading is unaffected. At 0, water applies no slowdown of its own.\n\nDefault: 4.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:319. Registered src/sv_phys.c:59 (default \"4\") -- LOCATOR only. Bridged global at src/sv_phys.c:1132 `movevars.waterfriction = sv_waterfriction.value;` (SV_SetMoveVars). Per-client fill at src/sv_user.c:3792-3799 does NOT overwrite movevars.waterfriction, so the global cvar value governs directly. ENFORCING read-site src/pmove.c:319 `drop = speed * movevars.waterfriction * pmove.waterlevel * pm_frametime;`. Polarity: drop (speed lost this frame) is proportional to the cvar, so higher=faster slowdown -- verified at :319 and the velocity rescale at :347-351 (`newspeed = speed - drop; ... VectorScale(pmove.velocity, newspeed, ...)`). Scope/threshold: the branch is gated by `if (pmove.waterlevel >= 2)` at src/pmove.c:317 (waterlevel 2 = chest/head submerged), with shallow/ground handled by other branches -- so 'only when at least chest/head deep' is enforced, not inferred. OFF-state: at value 0, drop=0 -> newspeed unchanged (no water-specific slowdown) -- derived from the :319 multiply by 0. Units intentionally omitted from the user doc: it is a per-frame decay coefficient scaled by pm_frametime and waterlevel, not a named unit. F-MV1: ktx/src/bot_movement.c:157-159 only READS cvar(\"sv_waterfriction\") to replicate water drag in the bot's own movement sim -- case (a) value/mechanism mirror, NOT a player-move mechanism override; the engine cvar still governs real player physics, so no cross-mod override. Cross-engine: src/sv_user.c:457 and src/sv_demo.c:1300 write movevars.waterfriction into the movevars message sent to clients/MVD so client prediction matches; this is context, not action-changing for an admin, so kept out of the user doc.",
  "description_proposed": null
}
```
