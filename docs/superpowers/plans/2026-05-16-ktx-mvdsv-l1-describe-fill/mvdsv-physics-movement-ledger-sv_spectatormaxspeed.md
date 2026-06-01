# describe-fill-synthesis ledger -- mvdsv `sv_spectatormaxspeed`

- **project:** mvdsv
- **knob:** `sv_spectatormaxspeed` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_spectatormaxspeed: synthesized -- top free-fly speed cap for spectators (PM_SpectatorMove); players use sv_maxspeed; no KTX override -- origin=synthesized ref=src/pmove.c:859 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the top free-flight speed for spectators moving around the map. A higher value lets spectators fly faster; a lower value keeps them slower. It applies only to spectator movement and does not affect playing clients (their cap is sv_maxspeed).
>
> Default: 500.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value governs spectator cap (global, not per-client) | src/sv_phys.c:1127 | `movevars.spectatormaxspeed = sv_spectatormaxspeed.value;` | MATCH |
| per-client fill does not overwrite this field | src/sv_user.c:3792-3799 | block does not assign movevars.spectatormaxspeed | MATCH |
| enforcing clamp; it is the top free-fly speed; higher=faster | src/pmove.c:859-861 | `if (wishspeed > movevars.spectatormaxspeed) { VectorScale(wishvel, movevars.spectatormaxspeed / wishspeed, wishvel); wishspeed = movevars.spectatormaxspeed; }` | MATCH |
| scope is spectator movement only | src/pmove.c:816 | `static void PM_SpectatorMove(void)` (function containing the clamp) | MATCH |
| players use sv_maxspeed via a different per-client chain | src/sv_user.c:3793 / src/pmove.c:450-452 | `movevars.maxspeed = sv_client->maxspeed;` ; `if (wishspeed > movevars.maxspeed) { ... }` | MATCH |
| default 500 | src/sv_phys.c:49 | `cvar_t sv_spectatormaxspeed = { "sv_spectatormaxspeed", "500"};` | MATCH |
| no KTX override | ktx/src (grep) | no hits for spectatormaxspeed | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Default: 500 | src/sv_phys.c:49 | `cvar_t sv_spectatormaxspeed = { "sv_spectatormaxspeed", "500"};` | MATCH |
| 1b | Default is registered (not cfg-drift) | src/sv_main.c:3514 | `Cvar_Register (&sv_spectatormaxspeed);` | MATCH |
| 2 | Set by: server config (settable, not ROM/serverinfo) | src/sv_phys.c:49 + src/cvar.h:61-63 | `{ "sv_spectatormaxspeed", "500"}` (no flags field => CVAR_NONE=0); `#define CVAR_ROM (1<<1)` not set | MATCH |
| 3 | Sets the top free-flight speed for spectators moving | src/pmove.c:858-861 | `// clamp to server defined max speed` / `if (wishspeed > movevars.spectatormaxspeed) { VectorScale(wishvel, movevars.spectatormaxspeed / wishspeed, wishvel); wishspeed = movevars.spectatormaxspeed; }` (inside PM_SpectatorMove, pmove.c:816) | MATCH |
| 3b | Value flows cvar->movevars->clamp | src/sv_phys.c:1127 | `movevars.spectatormaxspeed = sv_spectatormaxspeed.value;` | MATCH |
| 4 | Higher value = faster, lower = slower (polarity) | src/pmove.c:859-861 | clamp scales wishspeed DOWN to the cap; larger cap => later/less clamping, smaller cap => sooner clamping. Direct positive relationship. | MATCH |
| 5a | Applies ONLY to spectator movement | src/pmove.c:908-912 | `if (pmove.pm_type == PM_SPECTATOR || pmove.pm_type == PM_OLD_SPECTATOR) { PM_SpectatorMove(); ... return 0; }` -- clamp block lives only inside PM_SpectatorMove; dispatched only for spectator pm_types | MATCH |
| 5b | Does not affect playing clients | src/pmove.c:914+ | non-spectator clients fall through past the spectator dispatch to PM_NudgePosition/normal accel paths; none reference movevars.spectatormaxspeed (sole reads are pmove.c:859-861) | MATCH |
| 5c | Playing clients' cap is sv_maxspeed | src/pmove.c:450-452 (also 476-478, 507-509) + src/sv_phys.c:1126 | `if (wishspeed > movevars.maxspeed) { VectorScale(wishvel, movevars.maxspeed / wishspeed, wishvel); wishspeed = movevars.maxspeed; }`; `movevars.maxspeed = sv_maxspeed.value;` | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362. Trace discipline applied per enforce-trace-discipline.md.

Wide-grep found 10 use-sites; all traced:
- Registration: sv_phys.c:49 (cvar_t def, default "500", no flags), sv_main.c:3394 (extern), sv_main.c:3514 (Cvar_Register).
- Data flow: sv_phys.c:1127 (SV_SetMoveVars copies cvar.value -> movevars.spectatormaxspeed), pmove.h:76 (movevars struct field).
- ENFORCEMENT (the actual cap): pmove.c:859-861 inside PM_SpectatorMove() [func body pmove.c:816-882].
- Network replication (not behavior, just predictor sync): sv_user.c:452, sv_demo.c:1295 -- both write movevars.spectatormaxspeed to the client/demo stream so the prediction code applies the same cap. Not a behavior clause, no defect.

Scope is STRUCTURALLY enforced, not name-inferred: the clamp lives only inside PM_SpectatorMove(), which PM_PlayerMove() (pmove.c:886) dispatches to exclusively when pm_type is PM_SPECTATOR or PM_OLD_SPECTATOR (pmove.c:908-912, early-return). Non-spectator clients never reach that block and are instead capped by movevars.maxspeed (pmove.c:450/476/507 = sv_maxspeed, sv_phys.c:1126). The description's "applies only to spectator movement... their cap is sv_maxspeed" is exactly right.

Polarity (clause 4) verified against the clamp direction (scale-down-to-cap => monotone increasing relationship between cvar value and achievable speed). Semantic "free-flight" verified: spectator move forces onground=false (pmove.c:910) and uses a non-collision velocity integration (pmove.c:880-881), consistent with flying around the map.

No OFF-state clause asserted (description correctly omits one; there is no special value=0 branch -- value 0 would simply clamp wishspeed to 0, an emergent consequence not claimed by the text).

PROC-1: no residual judgment. Every clause reduces to a checkable fact at its enforcing line. Classification: TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_spectatormaxspeed",
  "type": "cvar",
  "description": "Sets the top free-flight speed for spectators moving around the map. A higher value lets spectators fly faster; a lower value keeps them slower. It applies only to spectator movement and does not affect playing clients (their cap is sv_maxspeed).\n\nDefault: 500.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pmove.c:859. Registered src/sv_phys.c:49 (default \"500\") -- LOCATOR only. Bridged global at src/sv_phys.c:1127 `movevars.spectatormaxspeed = sv_spectatormaxspeed.value;` (SV_SetMoveVars). Per-client fill at src/sv_user.c:3792-3799 does NOT overwrite movevars.spectatormaxspeed, so the global cvar value governs. ENFORCING read-site src/pmove.c:859-861 inside PM_SpectatorMove: `if (wishspeed > movevars.spectatormaxspeed) { VectorScale(wishvel, movevars.spectatormaxspeed / wishspeed, wishvel); wishspeed = movevars.spectatormaxspeed; }` -- this clamps the spectator's desired movement speed to the cvar, so it is the top free-fly speed; higher=faster. Scope: this code path is PM_SpectatorMove (function opens src/pmove.c:816) -- spectator-only; player movement uses the separate maxspeed clamps (src/pmove.c:450-452 etc.) reading movevars.maxspeed, which is set per-client from sv_client->maxspeed (src/sv_user.c:3793), a different chain -- so 'does not affect playing clients (cap is sv_maxspeed)' is action-relevant disambiguation and enforce-traced, not inferred. Units (qu/s) deliberately not named in prose; stated relative to sv_maxspeed which an admin already knows. F-MV1: zero hits in ktx/src for spectatormaxspeed -- engine governs entirely. Cross-engine: src/sv_user.c:452 / src/sv_demo.c:1295 publish movevars.spectatormaxspeed in the movevars message so client-side spectator prediction matches; context only, not inlined.",
  "description_proposed": null
}
```
