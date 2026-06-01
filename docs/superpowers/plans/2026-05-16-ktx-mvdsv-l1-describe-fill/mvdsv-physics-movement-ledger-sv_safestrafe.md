# describe-fill-synthesis ledger -- mvdsv `sv_safestrafe`

- **project:** mvdsv
- **knob:** `sv_safestrafe` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_safestrafe: synthesized -- SOCD strafe limiter; value=stop-frames forced after each strafe-direction reversal; 0=off; spectators exempt; no KTX override -- origin=synthesized ref=src/sv_user.c:3565 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Limits the advantage from rapidly flicking between left and right strafe (SOCD-style inputs). The value sets how many game frames a player's sideways movement is forced to stop after each change of strafe direction (a direct left-right flip is held one extra frame); the player only resumes strafing once those stop-frames have passed. Spectators are not affected. At 0, the limiter is off and strafing is unrestricted.
>
> Default: 0.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| enforcing read-site; value is the stop-frame count | src/sv_user.c:3565 | `required_frames = (int)sv_safestrafe.value;` | MATCH |
| sideways movement forced to stop while frames pending | src/sv_user.c:3573 | `ucmd->sidemove = 0;` | MATCH |
| stop-frames armed on strafe direction change | src/sv_user.c:3590 | `cl->safestrafe.pending_frames = required_frames;` | MATCH |
| resumes only after enough stop frames | src/sv_user.c:3597 | `if (cl->safestrafe.stop_frames < required_frames) {` | MATCH |
| 0/negative = off AND spectators unaffected | src/sv_user.c:3566 | `if (required_frames <= 0 || cl->spectator) return;` | MATCH |
| applied once per real command (frame units) | src/sv_user.c:3674-3676 | `if (!inside) { SV_ApplySafestrafe(sv_client, ucmd); }` | MATCH |
| default 0, serverinfo | src/sv_phys.c:67 | `cvar_t sv_safestrafe = { "sv_safestrafe", "0", CVAR_SERVERINFO };` | MATCH |
| SOCD intent (corroboration only) | src/sv_user.c:3555 | `Limit advantages from SOCD related enhancements by enforcing stop frames between strafe direction changes` | MATCH |
| no KTX override | ktx/src (grep) | no hits for safestrafe | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Limits advantage from rapid left/right strafe flicking (SOCD-style) | sv_user.c:3555 (comment) + 3587-3593 (enforcing) | `// Limit advantages from SOCD related enhancements by enforcing stop frames between strafe direction changes` ... `if (current_dir != 0 && previous_dir != 0 && current_dir != previous_dir) { ... ucmd->sidemove = 0; }` | MATCH |
| 2 | The value = number of game frames sideways movement is forced to stop after each strafe-direction change | sv_user.c:3590, 3592-3593, 3572-3574 | `cl->safestrafe.pending_frames = required_frames;` (3590) `cl->safestrafe.stop_frames = 1; ucmd->sidemove = 0;` (3592-3593); pending path: `ucmd->sidemove = 0; cl->safestrafe.pending_frames--;` (3573-3574) | MISMATCH (minor) -- on a direct flip the trigger frame is ALSO zeroed (3593) in addition to `pending_frames = required_frames` more zeroed frames, so total forced-stop frames = required_frames + 1, not required_frames. Resume gate is `stop_frames >= required_frames` with stop_frames seeded to 1 on the trigger frame (3592/3597), so the two trigger paths are not symmetric. The clause undercounts by one for the direct-flip case. |
| 3 | Player only resumes strafing once that many stop-frames have passed | sv_user.c:3597, 3605-3607 | `if (cl->safestrafe.stop_frames < required_frames) { ... ucmd->sidemove = 0; } else { cl->safestrafe.stop_frames = 0; }` | MATCH (gate is `stop_frames >= required_frames`; "that many stop-frames" reads correctly as required_frames, with stop_frames counting from the trigger frame) |
| 4 | Spectators are not affected | sv_user.c:3566-3567 | `if (required_frames <= 0 || cl->spectator) return;` | MATCH (spectators short-circuit before any ucmd modification) |
| 5 | At 0, limiter off / strafing unrestricted | sv_user.c:3565-3567 | `required_frames = (int)sv_safestrafe.value; if (required_frames <= 0 || cl->spectator) return;` | MATCH (value 0 -> early return, ucmd->sidemove untouched; also any negative value is off) |
| 6 | Default: 0 | sv_phys.c:67 | `cvar_t sv_safestrafe = { "sv_safestrafe", "0", CVAR_SERVERINFO };` | MATCH (registered default "0") |
| 7 | Set by: server config | sv_phys.c:67 + cvar.h:62 | flag `CVAR_SERVERINFO`; `#define CVAR_SERVERINFO (1<<0) // mirrored to serverinfo` | MATCH (server-side serverinfo cvar, no CVAR_ROM, settable via server config) |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. Single enforcing site: SV_ApplySafestrafe (sv_user.c:3558-3617), called exactly once from SV_RunCmd at sv_user.c:3675 gated on `!inside` (so the chopped recursive SV_RunCmd sub-commands at 3686/3689 do NOT re-apply it -- no double-application). State struct defined server.h:393-399; reset via memset on connect (sv_main.c:1465) and spawn (sv_user.c:2642). No other consumer of any safestrafe state field.

Five of seven clauses (purpose, spectator-scope, OFF-state, default, set-by) are exactly traced to enforcing lines and MATCH. The mechanism clauses (2 + 3) ARE genuinely enforce-traced (not name/comment inference -- this is NOT flavour-C), but the threshold framing in clause 2 is off by one for the common case: on a direct strafe flip the trigger frame's sidemove is zeroed at line 3593 in ADDITION to the `pending_frames = required_frames` countdown set at line 3590, so a direct flip forces required_frames + 1 zeroed frames total, while the description states the value equals the number of forced-stop frames. The resume-after-self-stop path (3595-3608) gates on `stop_frames >= required_frames` with stop_frames seeded to 1 at the trigger frame, so the two trigger paths are not perfectly symmetric in their effective count. This is a concrete, checkable divergence from the enforcing lines (not mere still-true vagueness), so the row is C-NEAR-MISS rather than TRACED-CLEAN. The description is directionally correct and true at user-doc altitude; a precise fix would say roughly: "after a strafe-direction change the player must accumulate sv_safestrafe stop-frames (counting the change frame) before sideways movement resumes; a direct flip is held for that many frames."

## flags_for_review

- [fyi/runtime-dead-suspect/vpass] sv_user.c: client_t.safestrafe.pending_direction (server.h:396) is WRITTEN at sv_user.c:3591 and 3601 but NEVER READ anywhere in the tree (grep of all *.c confirms only writes). It is a dead field -- the comment says 'Desired sidemove after stop' implying the stored direction would be re-applied on resume, but the resume path (3605-3608) simply stops zeroing and lets the live ucmd->sidemove through; the stored value is never used. Off-scope implementation observation, not a description defect.
- [fyi/other/vpass] Frame-count asymmetry in SV_ApplySafestrafe: a DIRECT strafe flip (3587-3594) forces sv_safestrafe + 1 zeroed frames total (trigger frame at 3593 plus pending countdown of sv_safestrafe), whereas the resume-after-self-stop path (3595-3608) gates on stop_frames >= sv_safestrafe with stop_frames seeded to 1 at the trigger. The two paths do not enforce an identical effective stop-duration. May be intentional, but worth an author/operator glance if the description's exact-frame framing is later tightened.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_safestrafe",
  "type": "cvar",
  "description": "Limits the advantage from rapidly flicking between left and right strafe (SOCD-style inputs). The value sets how many game frames a player's sideways movement is forced to stop after each change of strafe direction (a direct left-right flip is held one extra frame); the player only resumes strafing once those stop-frames have passed. Spectators are not affected. At 0, the limiter is off and strafing is unrestricted.\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3565. Registered src/sv_phys.c:67 `cvar_t sv_safestrafe = { \"sv_safestrafe\", \"0\", CVAR_SERVERINFO };` (default \"0\", serverinfo) -- LOCATOR. ENFORCING read-site src/sv_user.c:3565 `required_frames = (int)sv_safestrafe.value;` inside SV_ApplySafestrafe. Value meaning: required_frames is assigned as the stop-frame count -- on a direction change src/sv_user.c:3590 `cl->safestrafe.pending_frames = required_frames;` and while pending the input is zeroed src/sv_user.c:3573 `ucmd->sidemove = 0;` (also at :3593, :3603). So the value = number of frames sidemove is forced to 0 after a strafe reversal; movement resumes only after that many stop frames accrue (src/sv_user.c:3597 `if (cl->safestrafe.stop_frames < required_frames)`). OFF-state + scope src/sv_user.c:3566 `if (required_frames <= 0 || cl->spectator) return;` enforces both '0 (or negative) = off' and 'spectators unaffected'. Invoked once per real command via the `!inside` gate src/sv_user.c:3674-3676 `if (!inside) { SV_ApplySafestrafe(sv_client, ucmd); }` (before the >50ms chop-up at :3681), so the count is in whole input frames -- the `!inside` recursion detail is implementation-level and kept out of the user doc. SOCD framing corroborated by the function header comment src/sv_user.c:3555 'Limit advantages from SOCD related enhancements by enforcing stop frames between strafe direction changes' (comment is corroboration, not the citation; the enforcing lines above are). F-MV1: zero hits in ktx/src -- engine governs entirely. Cross-engine note: CVAR_SERVERINFO means the value is published in serverinfo, but that does not change what an admin sets, so not inlined.",
  "description_proposed": null
}
```
