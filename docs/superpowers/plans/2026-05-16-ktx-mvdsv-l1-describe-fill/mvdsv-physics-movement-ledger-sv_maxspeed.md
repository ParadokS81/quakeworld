# describe-fill-synthesis ledger -- mvdsv `sv_maxspeed`

- **project:** mvdsv
- **knob:** `sv_maxspeed` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxspeed: synthesized -- per-frame pmove wishspeed clamp via per-client movevars.maxspeed (defaults to sv_maxspeed, mod-overridable); KTX feeds per-player value, no mechanism override -- origin=synthesized ref=src/pmove.c:450 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the maximum ground running speed for players. A higher value lets players run faster; a lower value slows them down. This is the speed a player reaches while holding a movement key on the ground or in water; it does not change how fast that speed is gained (that is sv_accelerate). It is the server-wide default and can be overridden per player by the game mod (for example a speed powerup).
>
> Default: 320.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| caps ground/water/fly running speed | src/pmove.c:450,476,507 | `if (wishspeed > movevars.maxspeed) { VectorScale(wishvel, movevars.maxspeed / wishspeed, wishvel); wishspeed = movevars.maxspeed; }` (PM_AirMove site has `// clamp to server defined max speed`) | MATCH |
| does not change accel rate (separate knob) | src/pmove.c:367 | `accelspeed = accel * pm_frametime * wishspeed;` (accel arg is movevars.accelerate, not maxspeed) | MATCH |
| for players the value is per-client | src/sv_user.c:3793 | `movevars.maxspeed = sv_client->maxspeed;` (overwrites global bridge before PM_PlayerMove) | MATCH |
| per-client defaults to sv_maxspeed, mod can override | src/sv_user.c:889 | `sv_client->maxspeed = fofs_maxspeed? EdictFieldFloat(ent, fofs_maxspeed) : (int)sv_maxspeed.value;` | MATCH |
| Default 320 (registered) | src/sv_phys.c:48 | `cvar_t sv_maxspeed = { "sv_maxspeed", "320"};` | MATCH |
| also feeds bunny air-speed cap | src/pmove.c:421 | `speedcap = movevars.maxspeed * movevars.bunnyspeedcap;` | MATCH |
| KTX does not replace the mechanism | ktx/src/client.c:1844 | `self->maxspeed = cvar("sv_maxspeed");` (sets per-entity maxspeed field; engine pmove still clamps) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Sets the maximum (ground) running speed; clamps player movement speed | src/pmove.c:507-510 (ground branch follows at 512) | `// clamp to server defined max speed` / `if (wishspeed > movevars.maxspeed) { VectorScale(wishvel, movevars.maxspeed / wishspeed, wishvel); wishspeed = movevars.maxspeed; }` | MATCH |
| 2 | Polarity: higher value = faster ceiling, lower = slower | src/pmove.c:450/476/507 | clamp form `wishspeed = min(wishspeed, movevars.maxspeed)` -- raising the cvar raises the cap | MATCH |
| 3a | Effective in water | src/pmove.c:450-453 (PM_WaterMove) | `if (wishspeed > movevars.maxspeed) { ... wishspeed = movevars.maxspeed; } wishspeed *= 0.7;` | MATCH |
| 3b | Effective on the ground (the "running speed") | src/pmove.c:507-510 then onground branch 512-522 | clamp runs before onground split; PM_Accelerate drives velocity toward clamped wishspeed | MATCH (air/fly also read maxspeed at 476/507 but description's omission of air is a defensible simplification -- air target is dominated by `min(wishspd,30)` at pmove.c:395) |
| 4 | Does not change accel rate; that is sv_accelerate | src/pmove.c:515/521 + src/sv_phys.c:1128 | `PM_Accelerate(wishdir, wishspeed, movevars.accelerate)` ; `movevars.accelerate = sv_accelerate.value` -- accel rate is a separate movevar | MATCH |
| 5 | Server-wide default value | src/sv_phys.c:1126 ; src/sv_user.c:2637 | `movevars.maxspeed = sv_maxspeed.value` ; `cl->maxspeed = sv_maxspeed.value` (seeded on spawn) | MATCH |
| 6 | Overridable per player by the game mod (e.g. powerup) | src/sv_send.c:1025-1027 -> src/sv_user.c:3793 ; src/server.h:217 | `if (fofs_maxspeed && sv_client->maxspeed != EdictFieldFloat(ent, fofs_maxspeed)) { sv_client->maxspeed = EdictFieldFloat(ent, fofs_maxspeed); ...}` then `movevars.maxspeed = sv_client->maxspeed;` ; field comment `// localized maxspeed` | MATCH |
| 7 | Default: 320 (registered) | src/sv_phys.c:48 | `cvar_t sv_maxspeed = { "sv_maxspeed", "320"};` (registered at sv_main.c:3513, no override) | MATCH |
| 8 | Set by: server config (plain server cvar, no flags) | src/sv_phys.c:48 ; src/sv_main.c:3513 | `{ "sv_maxspeed", "320"}` -- no CVAR_SERVERINFO/ROM/USERINFO flags; `Cvar_Register(&sv_maxspeed);` | MATCH |

**V-pass notes:** Tag confirmed 1.11-53-g18d0362. Every material clause enforcement-traced including adjacent comments and the full per-client override call chain.

Override path (clause 6) fully followed callee-to-effect, not stopped at registration: spawn seeds cl->maxspeed and the QC field `maxspeed` from sv_maxspeed.value (sv_user.c:2637-2639); a mod writing the entity's .maxspeed field is detected at sv_send.c:1025 and copied into sv_client->maxspeed (plus svc_maxspeed sent for client prediction); at move time SV_RunCmd overwrites movevars.maxspeed with sv_client->maxspeed (sv_user.c:3793) BEFORE PM_PlayerMove, so the per-client (possibly mod-overridden) value is what pmove.c actually clamps against. server.h:217 comment "localized maxspeed" confirms semantics. "speed powerup" is correctly hedged as an example.

Clause 4 (accel-rate is sv_accelerate, not this): confirmed maxspeed and accelerate are distinct movevars; PM_Accelerate receives movevars.accelerate (=sv_accelerate.value) as the rate param while maxspeed only caps the target wishspeed.

WI-2: Default 320 verified against the REGISTERED literal `{ "sv_maxspeed", "320"}` (sv_phys.c:48), not a shipped cfg. No CVAR flags -> plain server-side config cvar, so "Set by: server config" is correct and there is no serverinfo/access nuance.

Only soft spot: clause 3's "on the ground or in water" omits air and fly modes, which also read movevars.maxspeed (pmove.c:476 PM_FlyMove, 507 PM_AirMove). Not classified as a near-miss because (a) both named contexts (ground, water) ARE enforcement-traced and correct, (b) the omission is a defensible user-doc simplification -- in air the effective per-tick accel target is min(wishspd,30) (pmove.c:395), so maxspeed's air role is secondary, and (c) the clause was not derived from name/enum/string inference. Ruled out a competing ground cap: MAXGROUNDSPEED_DEFAULT/MAXIMUM (pmove.c:554-555) is an unrelated rampjump vertical-velocity (velocity[2]) cap, not a horizontal running-speed cap.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX gives players haste (CTF grapple / haste rune) by writing the per-entity maxspeed field via cvar("sv_maxspeed") at ktx/src/client.c:1844, ktx/src/ctf.c:750/840, ktx/src/runes.c:197, and sets the cvar itself in game modes (ktx/src/commands.c:3234). This is the engine's own per-entity maxspeed override path (src/sv_user.c:889 fofs_maxspeed), NOT a replacement of the pmove clamp -- the engine cvar still governs the server-wide default. Recording per F-MV1 case (a) for a human look; documented as engine behavior.
- [fyi/suspected-bug/vpass] sv_user.c:451 carries an in-code FIXME ('// FIXME: this does'\''t work, Tonik?') on the svc_playerinfo maxspeed write, and it writes movevars.maxspeed rather than sv_client->maxspeed (commented-out). This is a long-standing engine note about per-client maxspeed propagation in one prediction path; it does not affect the authoritative server-side clamp (which correctly uses sv_client->maxspeed via sv_user.c:3793) but is worth noting as a known rough edge in the maxspeed prediction plumbing.
- [fyi/off-scope-entity/vpass] sv_maxspeed governs PLAYER ground/water/air movement only. Spectator movement is clamped by a separate cvar sv_spectatormaxspeed (default 500, src/sv_phys.c:49) via movevars.spectatormaxspeed at pmove.c:859-861. The proposed description scopes itself to 'players' so this is correct, but the sibling cvar is the spectator counterpart and may warrant its own row if not already covered.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxspeed",
  "type": "cvar",
  "description": "Sets the maximum ground running speed for players. A higher value lets players run faster; a lower value slows them down. This is the speed a player reaches while holding a movement key on the ground or in water; it does not change how fast that speed is gained (that is sv_accelerate). It is the server-wide default and can be overridden per player by the game mod (for example a speed powerup).\n\nDefault: 320.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:450. Enforced in the player-move code via the movevars bridge, NOT at registration (src/sv_phys.c:48 is only a LOCATOR). Per-frame wishspeed cap: src/pmove.c:450-452 PM_WaterMove `if (wishspeed > movevars.maxspeed) { VectorScale(...); wishspeed = movevars.maxspeed; }`, identically at src/pmove.c:476-478 (PM_FlyMove) and src/pmove.c:507-510 (PM_AirMove, comment `// clamp to server defined max speed`). Also feeds the bunny air-speed cap: src/pmove.c:421 `speedcap = movevars.maxspeed * movevars.bunnyspeedcap`. The accel-vs-topspeed split (clause 'does not change how fast speed is gained'): PM_Accelerate at src/pmove.c:367 uses a separate `accel` arg, not maxspeed. movevars.maxspeed source: for players it is the PER-CLIENT value, src/sv_user.c:3793 `movevars.maxspeed = sv_client->maxspeed` (overwrites the global bridge src/sv_phys.c:1126 right before PM_PlayerMove). sv_client->maxspeed defaults to sv_maxspeed.value unless the mod sets the per-entity maxspeed field: src/sv_user.c:889 `sv_client->maxspeed = fofs_maxspeed? EdictFieldFloat(ent, fofs_maxspeed) : (int)sv_maxspeed.value` and src/sv_user.c:2637 `cl->maxspeed = sv_maxspeed.value` (hence the 'overridden per player by the game mod' clause). Default 320 verified at the registration literal src/sv_phys.c:48 `{ \"sv_maxspeed\", \"320\"}` (WI-2). F-MV1: KTX reads sv_maxspeed in bot code and resets the per-player maxspeed field (ktx/src/client.c:1844, ktx/src/ctf.c:750/840, ktx/src/runes.c:197 for haste/CTF) and game modes set the cvar (ktx/src/commands.c:3234, ktx/src/admin.c:734) -- this uses the engine's own per-entity maxspeed mechanism and sets the cvar value; it does NOT replace the pmove clamp, so the engine cvar still governs. Case (a): NOT a mechanism override. Set-by server config (registered cvar, no command handler).",
  "description_proposed": null
}
```
