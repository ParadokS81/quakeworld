# describe-fill-synthesis ledger -- mvdsv `sv_maxpitch`

- **project:** mvdsv
- **knob:** `sv_maxpitch` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxpitch: synthesized -- per-frame upper clamp on client view pitch (look-down limit); settable 0..89.9; default 80 -- origin=synthesized ref=src/sv_user.c:3710 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Limits how far down a player is allowed to look. Each frame the server clamps the player's view pitch so it never exceeds this angle downward, regardless of what the client's config requests. Used to stop clients from aiming further down than intended.
>
> Value is in degrees of downward pitch and is itself clamped to the range 0 to 89.9 when set.
>
> Default: 80.
> Set by: server config.
> See also: sv_minpitch (the upward look limit).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| clamps per-command view pitch each frame | src/sv_user.c:3710 | `ucmd->angles[PITCH] = bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value);` | MATCH |
| sv_maxpitch is the UPPER bound (look-down limit) | src/bothdefs.h:151 | `#define bound(a,b,c) ((a) >= (c) ? (a) : (b) < (a) ? (a) : (b) > (c) ? (c) : (b))` (3rd arg = max) | MATCH |
| positive PITCH = looking down | src/mathlib.h:25; src/sv_user.c:3720 | `#define PITCH 0 // up / down`; `angles[PITCH] = -v_angle[PITCH]/3` | MATCH |
| settable range clamped 0..89.9 | src/sv_user.c:136 | `newval = bound (0, Q_atof(str), 89.9f);` | MATCH |
| Default 80 | src/sv_user.c:107 | `cvar_t sv_maxpitch = {"sv_maxpitch", "80", 0, OnChange_sv_maxpitch};` | MATCH |
| no KTX override | ktx/src (grep) | (zero hits for 'maxpitch') | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Result |
|---|--------|--------------------|---------|--------|
| 1 | Limits how far DOWN a player can look (sv_maxpitch = downward limit; positive pitch = down) | mathlib.c:260 (sign convention) + sv_user.c:3710 (clamp) + bothdefs.h:151 (bound macro) | `forward[2] = -sp;` (sp=sin(PITCH)) -> +PITCH => forward points down; `bound(a,b,c)` => c is upper clamp; `bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value)` => sv_maxpitch is the UPPER bound on PITCH | MATCH |
| 2 | Each frame the server clamps the player's view pitch so it never exceeds this angle downward | sv_user.c:3710 (in SV_RunCmd, per user-command) | `ucmd->angles[PITCH] = bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value);` | MATCH |
| 2b | Regardless of what the client's config requests (server overrides client-supplied pitch) | sv_user.c:3710-3712 | clamp overwrites client-supplied `ucmd->angles[PITCH]`, then `VectorCopy (ucmd->angles, sv_player->v->v_angle)` | MATCH |
| 3 | Used to stop clients aiming further down than intended | sv_user.c:3710 (interpretive, consistent with upper-bound clamp) | same clamp line | MATCH |
| 4 | Value in degrees; itself clamped to range 0 to 89.9 when set | sv_user.c:136 (OnChange_sv_maxpitch) | `newval = bound (0, Q_atof(str), 89.9f);` | MATCH |
| 5 | Default: 80 | sv_user.c:107 (registered default) + sv_main.c:3484 (Cvar_Register) | `cvar_t sv_maxpitch = {"sv_maxpitch", "80", 0, OnChange_sv_maxpitch};` | MATCH |
| 6 | Set by: server config (plain server cvar, no special access flag) | sv_user.c:107 + cvar.h:66-75 (struct layout) | flags field = `0` (3rd field); no USERINFO/SERVERINFO/ROM flag | MATCH |
| 7 | See also: sv_minpitch = the UPWARD look limit (lower bound, negative) | sv_user.c:108,152,3710 + mathlib.c:260 | `sv_minpitch = {"sv_minpitch","-70",...}`; OnChange `bound(-89.9f, ..., 0.0f)`; sv_minpitch is the LOWER bound on PITCH => -PITCH = up | MATCH |

**V-pass notes:** Oracle version confirmed: git describe == "1.11-53-g18d0362". Wide grep returned 8 use-sites, all accounted for: protocol.h:93 (serverinfo comment only), sv_main.c:3403 (extern), sv_main.c:3484 (Cvar_Register), sv_user.c:105 (fwd decl), sv_user.c:107 (registration + default + flags), sv_user.c:129-142 (OnChange clamp/serverinfo mirror), sv_user.c:3710 (the per-command enforcing clamp). No hidden enforcement elsewhere (no qtv/sv_ccmds read-site).

Polarity is the load-bearing clause and it is CORRECT, proven independently (not name-inferred): AngleVectors at mathlib.c:260 sets forward[2] = -sin(PITCH), so positive PITCH tilts the forward vector downward. Therefore the UPPER bound (sv_maxpitch, default 80, clamp ceiling [0,89.9]) genuinely limits looking DOWN, and the LOWER bound (sv_minpitch, default -70, [-89.9,0]) limits looking UP. The bound() macro at bothdefs.h:151 confirms arg ordering (a=min, c=max). The enforcing clamp lives in SV_RunCmd (sv_user.c:3710), processed per user command -- "each frame" is accurate.

WI-2 metadata: default "80" is the REGISTERED default in the cvar_t struct literal, not a shipped-cfg value -- verified. Flags field = 0 (confirmed 3rd struct member via cvar.h:66-75), no userinfo/rom flag, so "server config" access framing is correct. Description correctly omits engine-internal trivia (sv_ prefix stripped to serverinfo key "maxpitch", default-value hidden from serverinfo at sv_user.c:141) -- that is WHAT-vs-HOW user-doc discipline, not a missing clause.

Every material clause maps to a located, verified enforcing line including adjacent code/comments. No clause rests on name/string/enum inference. TRACED-CLEAN.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxpitch",
  "type": "cvar",
  "description": "Limits how far down a player is allowed to look. Each frame the server clamps the player's view pitch so it never exceeds this angle downward, regardless of what the client's config requests. Used to stop clients from aiming further down than intended.\n\nValue is in degrees of downward pitch and is itself clamped to the range 0 to 89.9 when set.\n\nDefault: 80.\nSet by: server config.\nSee also: sv_minpitch (the upward look limit).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3710. Enforcing read-site src/sv_user.c:3710 `ucmd->angles[PITCH] = bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value);` in SV_RunCmd's view-angle handling. The bound macro (src/bothdefs.h:151 `#define bound(a,b,c) ((a) >= (c) ? (a) : (b) < (a) ? (a) : (b) > (c) ? (c) : (b))`) clamps the middle arg into [a,c], so sv_maxpitch is the UPPER bound on ucmd->angles[PITCH]. PITCH sign convention: src/mathlib.h:25 `#define PITCH 0 // up / down`; Quake convention is positive pitch = looking down (corroborated at src/sv_user.c:3720 `sv_player->v->angles[PITCH] = -sv_player->v->v_angle[PITCH]/3` and by the OnChange settable range below), so the upper bound = the look-DOWN limit. Settable range clamped at the handler src/sv_user.c:136 `newval = bound (0, Q_atof(str), 89.9f);` -> 0..89.9. Default 80 from registration literal src/sv_user.c:107 `{\"sv_maxpitch\", \"80\", 0, OnChange_sv_maxpitch}` (WI-2; verified, not a cfg value). The OnChange also strips the value from serverinfo when it equals the default (src/sv_user.c:141) and republishes as serverinfo key 'maxpitch' (src/sv_user.c:142) -- this is a serverinfo-bookkeeping internal, not action-changing for the admin, so kept out of the user doc per D20. F-MV1: grep ktx/src for 'maxpitch' = zero hits; KTX QC bot/spectate files touch v_angle/fixangle but do not override this engine clamp -- the engine cvar governs.",
  "description_proposed": null
}
```
