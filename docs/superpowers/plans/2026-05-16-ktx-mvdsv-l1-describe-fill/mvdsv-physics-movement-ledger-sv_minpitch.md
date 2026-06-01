# describe-fill-synthesis ledger -- mvdsv `sv_minpitch`

- **project:** mvdsv
- **knob:** `sv_minpitch` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_minpitch: synthesized -- per-frame lower clamp on client view pitch (look-up limit); settable -89.9..0; default -70 -- origin=synthesized ref=src/sv_user.c:3710 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Limits how far up a player is allowed to look. Each frame the server clamps the player's view pitch so it never goes above this angle upward, regardless of what the client's config requests. Used to stop clients from aiming further up than intended.
>
> Value is in degrees of upward pitch (negative) and is itself clamped to the range -89.9 to 0 when set.
>
> Default: -70.
> Set by: server config.
> See also: sv_maxpitch (the downward look limit).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| clamps per-command view pitch each frame | src/sv_user.c:3710 | `ucmd->angles[PITCH] = bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value);` | MATCH |
| sv_minpitch is the LOWER bound (look-up limit) | src/bothdefs.h:151 | `#define bound(a,b,c) ((a) >= (c) ? (a) : (b) < (a) ? (a) : (b) > (c) ? (c) : (b))` (1st arg = min) | MATCH |
| negative PITCH = looking up | src/mathlib.h:25; src/sv_user.c:3720 | `#define PITCH 0 // up / down`; `angles[PITCH] = -v_angle[PITCH]/3` | MATCH |
| settable range clamped -89.9..0 | src/sv_user.c:152 | `newval = bound (-89.9f, Q_atof(str), 0.0f);` | MATCH |
| Default -70 | src/sv_user.c:108 | `cvar_t sv_minpitch = {"sv_minpitch", "-70", 0, OnChange_sv_minpitch};` | MATCH |
| no KTX override | ktx/src (grep) | (zero hits for 'minpitch') | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Limits how far UP a player can look (upward limit) | src/mathlib.h:25 + src/mathlib.c (AngleVectors) + src/sv_user.c:3710 | `#define PITCH 0 // up / down`; `forward[2] = -sp;` (neg pitch -> up); `bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value)` (minpitch = LOWER bound = most-negative = furthest up) | MATCH |
| 2 | Each frame server clamps view pitch | src/sv_user.c:3710 (in SV_RunCmd @3624) | `// clamp view angles` / `ucmd->angles[PITCH] = bound(...)` -- per-usercmd in SV_RunCmd | MATCH (minor: "frame" = usercmd-tick; not a defect) |
| 3 | Never above this angle upward, regardless of client config | src/sv_user.c:3710-3712 | clamp overwrites client-submitted `ucmd->angles[PITCH]`, then `VectorCopy(ucmd->angles, sv_player->v->v_angle)` | MATCH |
| 4 | Value in degrees of upward pitch (negative) | src/sv_user.c:108,152 + mathlib.c | default `-70`; self-clamp `-89.9..0` (all negative); `angles[PITCH] * (M_PI*2/360)` (degrees) | MATCH |
| 5 | Self-clamped to -89.9 .. 0 when set | src/sv_user.c:152 | `newval = bound (-89.9f, Q_atof(str), 0.0f);` | MATCH |
| 6 | Default -70 | src/sv_user.c:108 | `cvar_t sv_minpitch = {"sv_minpitch", "-70", 0, OnChange_sv_minpitch};` (registered default = static initializer); corroborated @157 `(newval == -70.0f)` | MATCH |
| 7 | Set by: server config | src/sv_main.c:3485 (Cvar_Register) + src/sv_user.c:3710 (server-side enforcement) | server cvar; OnChange comment @125 "want cvar names to have sv_ prefixes, but don't want them in serverinfo" | MATCH |
| 8 | See also: sv_maxpitch = downward look limit | src/sv_user.c:107 + :3710 | `sv_maxpitch = {"sv_maxpitch", "80", ...}` (positive = down, upper bound at 3710) | MATCH |

**V-pass notes:** All 8 clauses trace to located enforcing lines that MATCH the code and adjacent comments. Oracle version confirmed 1.11-53-g18d0362.

Use-site map (wide grep): registration declared static-initialized at sv_user.c:108 (default "-70"); Cvar_Register at sv_main.c:3485; OnChange self-clamp at sv_user.c:145-159; the ONLY value-read / enforcement at sv_user.c:3710. No other writes or reads of sv_minpitch.value exist in the tree.

Key trace work:
- Polarity (clause 1): NOT inferred from the name. Verified via three independent sites -- PITCH=0 axis (mathlib.h:25 "up/down"), the pitch->forward sign in AngleVectors (mathlib.c: forward[2]=-sp, so negative pitch tilts the forward vector UP), and the bound() role at 3710 where sv_minpitch is the LOWER (most-negative) bound = the cap on how far UP the player can aim. Symmetric with sv_maxpitch (default 80, positive = down).
- bound() macro (bothdefs.h:151): bound(a,b,c) clamps b into [a,c] (a wins ties when a>=c). At 3710 -> PITCH clamped to [sv_minpitch, sv_maxpitch].
- Self-clamp (clause 5): bound(-89.9f, Q_atof(str), 0.0f) is an EXACT match for the stated "-89.9 to 0" range.
- Default (WI-2): -70 verified against the registered static cvar_t initializer (MVDSV cvar pattern -- no RegisterCvarEx string), not a shipped .cfg value. Independently corroborated by the "don't show default in serverinfo" check (newstr = "" when newval == -70.0f) at sv_user.c:157.

Only soft spot: "each frame" (clause 2). The clamp runs once per processed usercmd inside SV_RunCmd (which also splits/recurses cmds with msec>50). Per-usercmd-tick is what a player experiences as the continuous server-side cap, so the phrasing is a benign simplification, not a contradiction. Does not move the row off TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] sv_minpitch/sv_maxpitch are also propagated to clients as serverinfo keys 'minpitch'/'maxpitch' via the ZQuake Z_EXT_PITCHLIMITS protocol extension (src/qwprot/src/protocol.h:93; SV_ServerinfoChanged calls at sv_user.c:142,158). The OnChange handlers suppress the key when the value equals the default (sv_user.c:141,157) to save serverinfo bytes. The description omits this client-propagation mechanism. This is an additive detail, not a clause defect -- the enforcement clause (server clamps each usercmd) is fully correct -- but a reader might assume the limit is purely server-internal when it is in fact advertised to capable clients.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_minpitch",
  "type": "cvar",
  "description": "Limits how far up a player is allowed to look. Each frame the server clamps the player's view pitch so it never goes above this angle upward, regardless of what the client's config requests. Used to stop clients from aiming further up than intended.\n\nValue is in degrees of upward pitch (negative) and is itself clamped to the range -89.9 to 0 when set.\n\nDefault: -70.\nSet by: server config.\nSee also: sv_maxpitch (the downward look limit).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3710. Enforcing read-site src/sv_user.c:3710 `ucmd->angles[PITCH] = bound(sv_minpitch.value, ucmd->angles[PITCH], sv_maxpitch.value);`. The bound macro (src/bothdefs.h:151) clamps the middle arg into [a,c]; sv_minpitch is the LOWER bound (first arg) on ucmd->angles[PITCH]. PITCH sign: src/mathlib.h:25 `#define PITCH 0 // up / down`; positive pitch = down, negative = up (corroborated at src/sv_user.c:3720 and by the OnChange settable range), so the lower bound = the look-UP limit. Settable range clamped at handler src/sv_user.c:152 `newval = bound (-89.9f, Q_atof(str), 0.0f);` -> -89.9..0. Default -70 from registration literal src/sv_user.c:108 `{\"sv_minpitch\", \"-70\", 0, OnChange_sv_minpitch}` (WI-2; verified, not a cfg value). The OnChange strips the value from serverinfo when it equals the default (src/sv_user.c:157) and republishes serverinfo key 'minpitch' (src/sv_user.c:158) -- serverinfo bookkeeping, not action-changing, kept out of the user doc per D20. F-MV1: grep ktx/src for 'minpitch' = zero hits; no KTX override, engine cvar governs.",
  "description_proposed": null
}
```
