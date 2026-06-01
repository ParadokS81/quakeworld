# describe-fill-synthesis ledger -- mvdsv `sv_maxvelocity`

- **project:** mvdsv
- **knob:** `sv_maxvelocity` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxvelocity: synthesized -- SV_CheckVelocity vector-magnitude clamp on server entities (toss/step paths), per-axis form is dead, players unaffected; no KTX override -- origin=synthesized ref=src/sv_phys.c:118 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Caps the overall speed of moving objects on the server -- projectiles such as rockets and nails, thrown gibs, dropped items, and monsters. If an object's speed would exceed this, its velocity is scaled back so its total speed equals the cap. It does not limit player running speed (that is sv_maxspeed).
>
> Default: 2000.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| caps overall (vector-magnitude) speed | src/sv_phys.c:117-122 | `wishspeed = VectorLength(ent->v->velocity); if (wishspeed > sv_maxvelocity.value) { VectorScale (ent->v->velocity, sv_maxvelocity.value/wishspeed, ent->v->velocity); ...}` (`// SV_MAXVELOCITY fix by Maddes`) | MATCH |
| per-axis form is NOT live (TRAP 1) | src/sv_phys.c:109-112 | `/*  if (ent->v->velocity[i] > sv_maxvelocity.value) ... */` (commented out) | MATCH (dead) |
| applies to tossed/projectile entities | src/sv_phys.c:739 | `SV_CheckVelocity (ent);` (inside SV_Physics_Toss) | MATCH |
| applies to stepping entities (monsters) | src/sv_phys.c:813 | `SV_CheckVelocity (ent);` (inside SV_Physics_Step) | MATCH |
| does NOT limit players | src/pmove.c:507 | players clamp on movevars.maxspeed, not sv_maxvelocity | MATCH |
| Default 2000 (registered) | src/sv_phys.c:44 | `cvar_t sv_maxvelocity = { "sv_maxvelocity","2000"};` | MATCH |
| no KTX override | ktx/src (grep) | zero references to sv_maxvelocity | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1a | Caps overall (total/magnitude) speed when it would exceed the cap | sv_phys.c:117-118 | `wishspeed = VectorLength(ent->v->velocity);` / `if (wishspeed > sv_maxvelocity.value)` | MATCH |
| 1b | Velocity is scaled back so total speed equals the cap | sv_phys.c:120-121 | `VectorScale (ent->v->velocity, sv_maxvelocity.value/wishspeed, ent->v->velocity);` / `wishspeed = sv_maxvelocity.value;` | MATCH (scale factor cap/speed -> new magnitude == cap; describes LIVE "Maddes fix" not the commented-out per-axis clamp at 109-112) |
| 2a | Applies to projectiles (rockets/nails) | sv_phys.c:739 via SV_RunEntity dispatch 873-877 | `case MOVETYPE_FLYMISSILE: SV_Physics_Toss (ent);` -> `SV_CheckVelocity (ent);` | MATCH (FLYMISSILE/TOSS missiles route through SV_Physics_Toss which calls SV_CheckVelocity) |
| 2b | Applies to thrown gibs / dropped items (toss/bounce) | sv_phys.c:739, 814-817 | `SV_CheckVelocity (ent);` + comment `to fix the way dead bodies and gibs behave`; TOSS/BOUNCE dispatch 873-877 | MATCH |
| 2c | Applies to monsters | sv_phys.c:813 via dispatch 870-871; fn comment 792 | `case MOVETYPE_STEP: SV_Physics_Step (ent);` -> `SV_CheckVelocity (ent);`; "Monsters freefall when they don't have a ground entity" | MATCH |
| 3 | Does NOT limit player running speed (that is sv_maxspeed) | sv_phys.c:995-996 (clients skip entity loop) + pmove.c:450-452 (sv_maxspeed governs player) | `if (i > 0 && i <= MAX_CLIENTS) continue; // clients are run directly from packets` ; `if (wishspeed > movevars.maxspeed) { VectorScale(wishvel, movevars.maxspeed / wishspeed, wishvel);` (movevars.maxspeed = sv_maxspeed.value, sv_phys.c:1126) | MATCH (SV_CheckVelocity absent from pmove.c/sv_user.c; player path bounded by sv_maxspeed instead) |
| 4 | Default: 2000 | sv_phys.c:44 | `cvar_t sv_maxvelocity = { "sv_maxvelocity","2000"};` | MATCH (registered default string "2000"; registered at sv_main.c:3510) |
| 5 | Set by: server config | sv_phys.c:44 + cvar.h:66-75 | initializer `{ "sv_maxvelocity","2000"}` sets name+string only; struct field 3 is `int flags` -> flags=0, no CVAR_SERVERINFO/special flag | MATCH (plain server cvar, console/config-settable, no access restriction) |

**V-pass notes:** Tag confirmed 1.11-53-g18d0362. Every material clause enforce-traced to a live line.

Mechanism (clause 1): The LIVE enforcement is magnitude-based scaling (SV_CheckVelocity, sv_phys.c:117-122, "SV_MAXVELOCITY fix by Maddes"): VectorLength gives total speed, and if it exceeds the cap, velocity is rescaled so its new magnitude equals the cap. The description matches this exactly. Critically, the synth did NOT describe the OLD per-axis clamp at lines 109-112 (clamp each component to +/- cap), which is commented out (`/* ... */`) and therefore dead. The description correctly reflects total-speed scaling, not per-axis clamping. This is the precise distinction the trace discipline guards against.

Scope (clause 2): SV_CheckVelocity is reached only from SV_Physics_Toss (sv_phys.c:739) and SV_Physics_Step (sv_phys.c:813). The dispatcher SV_RunEntity (858-878) routes MOVETYPE_TOSS/BOUNCE/FLY/FLYMISSILE -> Toss (projectiles, bouncing/dropped items, thrown gibs; gib/corpse intent confirmed by comment 814-815) and MOVETYPE_STEP -> Step (monsters, confirmed by fn comment 792). The rockets/nails/gibs/items/monsters enumeration is an accurate illustration of the movetypes that pass through; the examples are the conventional QW entities using those movetypes (mod-spawned, but the engine cvar bounds whatever uses these movetypes).

Scope-exclusion (clause 3): Decisive evidence at sv_phys.c:995-996 -- client edicts (index 1..MAX_CLIENTS) `continue` and never enter SV_RunEntity, so they never hit SV_CheckVelocity. grep confirms SV_CheckVelocity appears in neither pmove.c nor sv_user.c. Player speed is instead bounded by movevars.maxspeed (= sv_maxspeed.value, set at sv_phys.c:1126) inside PM_* in pmove.c (450-452 etc). So "does not limit player running speed (that is sv_maxspeed)" is enforcement-confirmed on BOTH sides: maxvelocity is absent from the player path, and sv_maxspeed is present in it.

Metadata: Default "2000" is the registered initializer default (sv_phys.c:44), registered via Cvar_Register at sv_main.c:3510 -- not a shipped-cfg value (WI-2 clean). "Set by: server config" verified against the cvar_t struct (cvar.h:66-75): the initializer leaves the `flags` field (struct position 3) at 0, so no CVAR_SERVERINFO or access flag; it is an ordinary console/config-settable server cvar.

No PROC-1 judgment residual. No WI2 metadata defect.

## flags_for_review

- [fyi/other/vpass] sv_phys.c:109-112 contains a commented-out (/* */) earlier implementation of the velocity bound -- a per-axis clamp (clamp each component to +/- sv_maxvelocity) that predates the live magnitude-scaling 'Maddes fix' at lines 116-122. It is dead code. The proposed description correctly describes the LIVE magnitude-scaling behavior and does NOT describe the dead per-axis clamp, so this is not a defect -- flagging only as FYI in case a future tracer encounters the commented block and is misled into thinking maxvelocity clamps per-axis.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxvelocity",
  "type": "cvar",
  "description": "Caps the overall speed of moving objects on the server -- projectiles such as rockets and nails, thrown gibs, dropped items, and monsters. If an object's speed would exceed this, its velocity is scaled back so its total speed equals the cap. It does not limit player running speed (that is sv_maxspeed).\n\nDefault: 2000.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_phys.c:118. Enforced in SV_CheckVelocity, NOT at registration (src/sv_phys.c:44 is only a LOCATOR). The LIVE clamp is the magnitude clamp src/sv_phys.c:117-122: `wishspeed = VectorLength(ent->v->velocity); if (wishspeed > sv_maxvelocity.value) { VectorScale(ent->v->velocity, sv_maxvelocity.value/wishspeed, ent->v->velocity); wishspeed = sv_maxvelocity.value; }` (comment `// SV_MAXVELOCITY fix by Maddes`). TRAP 1: the per-axis clamp at src/sv_phys.c:109-112 is COMMENTED OUT and is NOT the enforcing code -- the vector-magnitude form is. Scope (entities, NOT players): SV_CheckVelocity is called only from SV_Physics_Toss src/sv_phys.c:739 (MOVETYPE_TOSS/BOUNCE/FLY etc -- projectiles, gibs, dropped items) and SV_Physics_Step src/sv_phys.c:813 (monsters/objects); players move through PM_PlayerMove which uses movevars.maxspeed, not sv_maxvelocity (hence 'does not limit player running speed'). Default 2000 verified at registration literal src/sv_phys.c:44 `{ \"sv_maxvelocity\",\"2000\"}` (WI-2). F-MV1: zero references in ktx/src -- not overridden. Set-by server config (registered cvar, no command handler).",
  "description_proposed": null
}
```
