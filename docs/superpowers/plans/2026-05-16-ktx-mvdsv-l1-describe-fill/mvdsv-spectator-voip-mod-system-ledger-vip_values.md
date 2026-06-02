# describe-fill-synthesis ledger -- mvdsv `vip_values`

- **project:** mvdsv
- **knob:** `vip_values` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_values: synthesized -- per-password numeric VIP level (parallel to vip_password tokens; empty=1-based index; 0=not-VIP), exposed to the mod via ClientConnect + the *VIP userinfo key; engine slot math uses only the VIP boolean -- origin=synthesized ref=src/sv_main.c:2750 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Assigns a numeric VIP level to each VIP password, matched up position-by-position with the space-separated list in vip_password. The first number applies to the first password, the second to the second, and so on. When a spectator connects with a VIP password, the matching number becomes their VIP level, which is handed to the game mode and published in their player info. Assigning a slot the value 0 makes that password count as not-VIP.
>
> Leave empty to give each VIP password a level equal to its position in the list (first password = 1, second = 2, ...).
>
> Default: empty.
> Set by: server config.
> See also: vip_password.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value-mode gated on non-empty vip_values | src/sv_main.c:2750 | `if (vip_values.string[0]) {` | yes |
| each token parsed as an int into a parallel array | src/sv_main.c:2754-2756 | `Cmd_TokenizeString(vip_values.string); for (...) vip_value[i] = atoi(Cmd_Argv(i));` | yes |
| level = parallel value when set, else 1-based index | src/sv_main.c:2762 | `return (use_value ? vip_value[i] : i+1);` | yes |
| position-by-position pairing with vip_password | src/sv_main.c:2758-2762 | `Cmd_TokenizeString(vip_password.string); for(...) if (!strcmp(Cmd_Argv(i), pass) ...) return (...vip_value[i]...);` | yes |
| value 0 => not-VIP (slot ignored as VIP) | src/sv_main.c:1042, 1174-1177 | `if ( !( vip = SV_VIPbyPass( s ) ) )` ; `if (cl->vip) vips++; else spectators++;` | yes |
| level handed to game-mode ClientConnect | src/sv_user.c:991 | `G_FLOAT(OFS_PARM0) = (float) sv_client->vip;` | yes (also :2727, :2814) |
| level published as *VIP player-info key | src/sv_user.c:295 | `Info_SetStar (&sv_client->_userinfo_ctx_, "*VIP", sv_client->vip ? va("%d", sv_client->vip) : "");` | yes |
| engine slot-reservation uses VIP boolean, not magnitude | src/sv_main.c:1204 | `if (spass && (spectators < (int)maxspectators.value || vips < (int)maxvip_spectators.value))` | yes (vips counts non-zero vip clients) |
| registered default empty | src/sv_main.c:104 | `cvar_t vip_values = {"vip_values", ""};` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Assigns a NUMERIC VIP level to each VIP password | src/sv_main.c:2756 | `vip_value[i] = atoi(Cmd_Argv(i));` | MATCH (atoi => numeric) |
| 2 | Matched POSITION-BY-POSITION (1st num -> 1st pw, etc.) | src/sv_main.c:2754-2763 | `Cmd_TokenizeString(vip_values.string)` ... loop `vip_value[i]=atoi(Cmd_Argv(i))`; then `Cmd_TokenizeString(vip_password.string)` ... `return (use_value ? vip_value[i] : i+1)` | MATCH (same index i into both tokenized lists) |
| 3 | Matched against the space-separated list in vip_password | src/sv_main.c:2759,2762 | `Cmd_TokenizeString(vip_password.string)` ; `if (!strcmp(Cmd_Argv(i), pass) ...)` | MATCH (Cmd_TokenizeString = whitespace split) |
| 4 | When a spectator connects with a VIP password, matching number becomes their VIP level | src/sv_main.c:1042-1102 (CheckPasswords) -> :1421 | `vip = SV_VIPbyPass( s )` ... `*vip_ptr = vip` ... `newcl->vip = vip;` | MATCH |
| 5 | ...which is handed to the game mode | src/sv_user.c:991,2727,2814 | `G_FLOAT(OFS_PARM0) = (float) sv_client->vip;` immediately before `PR_GameClientConnect(...)` | MATCH (OFS_PARM0 -> QC/native progs ClientConnect; PR_GameClientConnect = PR1/PR2 game progs per src/progs.h:266, src/pr2.h:42) |
| 6 | ...and published in their player info | src/sv_main.c:1437 ; src/sv_user.c:295 ; src/pr2_cmds.c:1629 | `Info_SetStar(&newcl->_userinfo_ctx_, "*VIP", s)` ; `Info_SetStar(... "*VIP", sv_client->vip ? va("%d",sv_client->vip) : "")` ; `else if (!strcmp(key,"*VIP")) snprintf(ov,...,"%d",cl->vip)` | MATCH (*VIP info star-key) |
| 7 | Assigning a slot the value 0 makes that password count as not-VIP | src/sv_main.c:2756,2763 + caller src/sv_main.c:1042/1078 | `atoi("0")` => 0 returned by `return vip_value[i]`; caller `if ( !( vip = SV_VIPbyPass(...) ) )` treats 0 as not-VIP (falls through to IP check) | MATCH |
| 8 | Leave empty => level = position in list (1st=1, 2nd=2, ...) | src/sv_main.c:2750,2763 | `if (vip_values.string[0]) { use_value = true; ... }` ; `return (use_value ? vip_value[i] : i+1)` (use_value false when empty => i+1) | MATCH |
| 9 | Default: empty | src/sv_main.c:104 ; :3474 | `cvar_t vip_values = {"vip_values", ""};` ; `Cvar_Register (&vip_values);` (plain register, no Ex default) | MATCH |
| 10 | Set by: server config (server cvar, no access flag) | src/sv_main.c:104,3474 | declared in sv_main.c, plain `Cvar_Register`, no CVAR_* flags | MATCH (consistent) |
| 11 | See also: vip_password | src/sv_main.c:2750-2763 | vip_values is read only inside SV_VIPbyPass alongside vip_password tokenization | MATCH (correct partner) |

**V-pass notes:** Oracle version confirmed: 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

VERDICT: TRACED-CLEAN. Every material clause (polarity, position-mapping, value-0 OFF-state, empty-default fallback, game-mode handoff, player-info publication, registered default) maps to a located, verified enforcing line. The single enforcing site is SV_VIPbyPass (src/sv_main.c:2741-2766); I followed the value through CheckPasswords -> newcl->vip -> (a) OFS_PARM0/PR_GameClientConnect and (b) *VIP Info_SetStar. vip_values is referenced ONLY in sv_main.c (decl :104, read :2750/2754, register :3474) -- no cross-mod override; vip_value[] is a stack-local int array, not a QC concept.

Three minor-but-accurate observations that do NOT lower the classification:
1. Position-mapping precision: BOTH the value-tokenize loop (:2755 `for i<Cmd_Argc()` over vip_values) and the password-match loop (:2761) re-run Cmd_TokenizeString, so index i is consistent across the two lists. The memset at :2753 zeroes all MAX_ARGS slots first, so if there are MORE passwords than values, surplus passwords resolve to value 0 (not-VIP). The source's own comment at :2752 ("2VVD: vip_password count may be not equal vip_values count, what we must do in this case?") flags this as a known unresolved edge; the description's clean position-by-position framing describes the intended/aligned case and is not contradicted -- the under-supplied tail just yields 0.
2. "When a spectator connects" -- the VIP-by-password resolution in CheckPasswords runs on BOTH the spectator-password branch (:1042) AND the plain-password branch (:1078). The description's "spectator" framing matches the canonical purpose (vip_password = "password for entering as a VIP spectator", :103) and is not wrong, just the headline case.
3. "the matching number becomes their VIP level" is the PASSWORD contribution; at preconnect (sv_user.c:285-286) the engine takes max(cl->vip, SV_VIPbyIP(realip)) -- IP can RAISE but never LOWER the password-derived level. This is an independent IP mechanism, not a vip_values concern, so the description is not overclaiming.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 CROSS-MOD: vip_values' per-password number is published to the *VIP userinfo key (sv_user.c:295) and passed to the mod's QC ClientConnect (sv_user.c:991/:2727/:2814) -- but the dominant mod KTX IGNORES it. KTX's VIP() consumer at ktx/src/vip.c:29 is `return 0; //atoi(infokey(cl, "*VIP", vip, sizeof(vip)));` -- the *VIP read is COMMENTED OUT and hardcoded to 0, so KTX's entire VIP-rights bit-flag system (VIP_NORMAL/VIP_NOTKICKABLE/VIP_ADMIN/VIP_RCON, VIP_IsFlags, VIP_ShowRights in vip.c) is dead on a stock KTX server. Consequence for the admin: on KTX, the *level number* vip_values assigns has no mod-visible effect; only the engine-side boolean (is-VIP, which drives maxvip_spectators reserved spectator slots) is live, and that boolean comes from vip_password having a matching entry (any non-zero level), not from vip_values. I kept the L1 description to the engine-legible facts and did NOT claim the level grants any rights. Worth a human look: the L3 VIP-spectator concept note should document that vip_values level magnitude is effectively inert under KTX.
- [fyi/other/vpass] src/sv_main.c:2752 carries an author TODO comment ('2VVD: vip_password count may be not equal vip_values count, what we must do in this case?'). The de-facto behavior IS well-defined by the memset at :2753 (surplus passwords -> value 0 = not-VIP; surplus values -> ignored since the match loop iterates the password count). Not a bug per se, but a documented author uncertainty about the mismatch case. The proposed description sidesteps it cleanly via the 'value 0 = not-VIP' clause, which happens to cover the under-supplied tail.
- [fyi/off-scope-entity/vpass] VIP level is resolved by max() of password-derived and IP-derived levels at preconnect (sv_user.c:285-286: `if (sv_client->vip < SV_VIPbyIP(sv_client->realip)) sv_client->vip = SV_VIPbyIP(...)`). So a vip_values slot set to a LOW non-zero number can be silently raised by a matching vip_addip IP entry. Out-of-scope for vip_values' own description (correctly not mentioned), but relevant cross-reference if a vip_password or vip_addip description is later written.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_values",
  "type": "cvar",
  "description": "Assigns a numeric VIP level to each VIP password, matched up position-by-position with the space-separated list in vip_password. The first number applies to the first password, the second to the second, and so on. When a spectator connects with a VIP password, the matching number becomes their VIP level, which is handed to the game mode and published in their player info. Assigning a slot the value 0 makes that password count as not-VIP.\n\nLeave empty to give each VIP password a level equal to its position in the list (first password = 1, second = 2, ...).\n\nDefault: empty.\nSet by: server config.\nSee also: vip_password.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2750. Enforcing function SV_VIPbyPass(pass) at sv_main.c:2741-2766. 'Parallel numeric level per password' clause: sv_main.c:2750 `if (vip_values.string[0])` gates value-mode on; sv_main.c:2754 `Cmd_TokenizeString(vip_values.string)` then sv_main.c:2755-2756 `for (i=0; i<Cmd_Argc(); i++) vip_value[i] = atoi(Cmd_Argv(i));` parses each space-delimited token as an int into a parallel array; sv_main.c:2758 then tokenizes vip_password and sv_main.c:2760-2762 matches the supplied password against each token, returning at sv_main.c:2762 `return (use_value ? vip_value[i] : i+1);` -- so WITH vip_values the returned level is the parallel value, WITHOUT it the level is the 1-based index i+1. That ENFORCES both the 'position-by-position pairing with vip_password' clause and the 'empty -> level = position (first=1)' clause. 'Value 0 makes that password non-VIP' clause: SV_VIPbyPass returns the value verbatim; callers treat the return as the vip level where 0 means not-VIP -- sv_main.c:1042 `if ( !( vip = SV_VIPbyPass( s ) ) )` falls through on a 0 return, and the connect-slot logic at sv_main.c:1174-1177 increments the vips counter only `if (cl->vip)` (non-zero), so a 0-valued slot is treated as not-VIP. 'Handed to the game mode' clause: sv_client->vip is passed as the QC ClientConnect parameter `G_FLOAT(OFS_PARM0) = (float) sv_client->vip;` at sv_user.c:991, :2727, :2814. 'Published in player info' clause: `Info_SetStar (&sv_client->_userinfo_ctx_, \"*VIP\", sv_client->vip ? va(\"%d\", sv_client->vip) : \"\");` at sv_user.c:295. Default clause: bare registration `cvar_t vip_values = {\"vip_values\", \"\"};` sv_main.c:104 = empty. Set-by: plain cvar (no CVAR flags) -> server config / rcon. IMPORTANT precision held OUT of an over-claim: the engine's own slot-reservation (maxvip_spectators, sv_main.c:1204) gates on the COUNT of VIP spectators (boolean vips++ per non-zero vip), NOT on the level magnitude -- so the specific number vip_values assigns matters only to the game mode and the *VIP key, not to the engine's reserved-slot math. I therefore describe the level as 'handed to the game mode / published in player info' rather than claiming the number itself changes any engine behavior beyond the 0=not-VIP boundary. Cross-engine consequence (what the mod DOES with the level) routed to vip_password See-also rather than asserted, because the dominant mod ignores it (see flag). Per D20, all file:line + the OFS_PARM0/Info_SetStar internals kept in reasoning, not `description`.",
  "description_proposed": null
}
```
