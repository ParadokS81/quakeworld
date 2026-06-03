# describe-fill-synthesis ledger -- mvdsv `password`

- **project:** mvdsv
- **knob:** `password` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:password: synthesized -- player-connect password gate; empty or 'none' disables; VIP bypasses; value never echoed -- origin=synthesized ref=src/sv_main.c:1085 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a password that clients must supply to connect as a player. When set, anyone trying to join as a player without the matching password is refused; players already connected as spectators are likewise told to reconnect with the password. An empty value (or the literal "none") disables the requirement, leaving the server open to players. Clients granted VIP access bypass this gate. The password is never shown to clients.
>
> Default: empty (no player password required).
> Set by: server config / rcon.
> See also: spectator_password, vip_password, rcon_password.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default empty | src/sv_main.c:72 | `cvar_t password = {"password", ""};` | MATCH |
| player must supply matching password to connect | src/sv_main.c:1085 | `if (!vip && pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s))` -> return false | MATCH |
| empty OR 'none' disables the gate (OFF-state) | src/sv_main.c:1085 | `pwd[0] && strcasecmp(pwd, "none")` (both must hold to enforce) | MATCH |
| VIP bypasses | src/sv_main.c:1085 | leading `!vip &&` guard (vip from src/sv_main.c:1078-1081) | MATCH |
| connected spectator blocked from joining as player | src/sv_user.c:2674 | `if (password.string[0] && strcmp (password.string, "none"))` -> 'requires a player password' | MATCH |
| value never shown to clients | src/sv_main.c:1088 / 1098 | generic `server requires a password`; `Info_RemoveKey(userinfo,"password")` | MATCH |
| siblings exist for See-also | src/sv_main.c:71,102,103; 1050 | rcon_password / vip_password / spectator_password registered + enforced | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Sets a password clients must supply to connect AS A PLAYER (player-scoped, not spectator) | sv_main.c:1032-1037 (branch), 1083 (gate var), 72 (comment) | `char *s = Info_ValueForKey (userinfo, "spectator");` ... `if (s[0] && strcmp(s, "0")) {...spectator branch...} else { ... pwd = password.string;` // `cvar_t password = {"password",""}; // password for entering the game` | MATCH |
| 2 | Player join without matching password is REFUSED | sv_main.c:1085-1091 | `if (!vip && pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s)) { Con_Printf("...:password failed\n",...); Netchan_OutOfBandPrint(...,"%c\nserver requires a password\n\n",...); return false; }` | MATCH |
| 3 | Already-connected spectators are told to disconnect/reconnect with the password | sv_user.c:2674-2677 (Cmd_Join_f) | `if (password.string[0] && strcmp (password.string, "none")) { SV_ClientPrintf(..., "This server requires a %s password. Please disconnect, set the password and reconnect as %s.\n","player","player"); return; }` | MATCH |
| 4 | Empty value disables the requirement (open to players) | sv_main.c:1085 + sv_user.c:2674 (the `pwd[0]` / `password.string[0]` guard) | `if (!vip && pwd[0] && ...)` / `if (password.string[0] && ...)` -- empty string => guard false => no gate | MATCH |
| 5 | The literal "none" also disables | sv_main.c:1085 (`strcasecmp(pwd,"none")`); sv_user.c:2674 (`strcmp(...,"none")`); sv_main.c:3234 (needpass) | `... && strcasecmp(pwd, "none") && ...` / `... && strcmp (password.string, "none"))` | MATCH (lowercase literal works at every site; connect-gate is case-insensitive superset) |
| 6 | VIP-access clients bypass this gate | sv_main.c:1078-1081 (vip set), 1085 (`!vip` short-circuit), 2741-2748 (SV_VIPbyPass) | `if (!(vip = SV_VIPbyPass(s))) { vip = SV_VIPbyIP(net_from); }` then `if (!vip && pwd[0] && ...)` | MATCH (for the connect-time player gate that clauses 1-2 describe; see precision flag re: Cmd_Join_f) |
| 7 | Password never shown to clients | sv_main.c:72/3444 (no CVAR_SERVERINFO), 3243-3245 (only `needpass` bitmask published), 1098 (`Info_RemoveKey`) | `cvar_t password = {"password", ""};` + `Cvar_Register(&password);` (no SERVERINFO flag, unlike lines 50-168 cvars); `Info_SetValueForKey(svs.info,"needpass",va("%i",v),...)`; `Info_RemoveKey(userinfo,"password"); // remove passwd` | MATCH |
| 8 | Default: empty | sv_main.c:72, 3444 | `cvar_t password = {"password", ""};` registered via plain `Cvar_Register(&password);` -- registered default empty (WI-2: verified at registration, not a shipped .cfg) | MATCH |
| 9 | Set by: server config / rcon | sv_main.c:72 (no CVAR_ROM), 3213-3231 (SV_CheckVars re-canon on change) | plain server cvar, settable console/rcon/config; `if (strcmp(password.string, pw) || ...) { ... Cvar_Set(&password, pw); ...}` | MATCH |
| 10 | See also: spectator_password, vip_password, rcon_password | sv_main.c:102, 103, 71 | `cvar_t spectator_password = {"spectator_password",""};` `cvar_t vip_password = {"vip_password",""};` `cvar_t rcon_password = {"rcon_password",""};` -- spectator_password+vip_password are the adjacent sibling gates in CheckPasswords; rcon_password the admin sibling | MATCH |

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

All 10 material clauses map to located, verified enforcing lines (code + adjacent comments). No clause contradicts the code; no clause is bare name/enum/string/comment inference. Classification: TRACED-CLEAN.

Enforcement map (wide-read WI-1, whole tree): the `password` cvar's gating lives in TWO files, neither of which is the registration file's neighbor:
- CONNECT-time player gate: sv_main.c:CheckPasswords (1027-1106). Branches on the `spectator` userinfo key (1037). If connecting as spectator -> spectator_password gates (1050-1052), NOT this cvar. Else (player connect) -> `pwd = password.string` (1083) and refuse at 1085-1091. This is the gate clauses 1, 2, 4, 5, 6 describe.
- JOIN-command gate (already-connected spectator running `join`): sv_user.c:Cmd_Join_f (2674-2677). This is clause 3's site. Distinct enforcing line, different file from registration -- exactly the WI-1 "may live in a different file" case.
- Setter/canonicalizer: sv_main.c:SV_CheckVars (3213-3246) trims/re-sets and publishes the `needpass` bitmask (value 1 if player password active) to svs.info -- this is the only thing about the password that reaches clients, and it is a presence flag, not the value (supports clause 7).

Clause-1 scope is precise and was double-checked: the `password` CVAR gates players only; `spectator_password` gates spectators. The `password` userinfo FIELD is additionally read in the spectator branch (1044) purely as a VIP-promotion key, which does not muddy "password cvar = player gate."

Clause 7 ("never shown") verified two ways: (a) `password` registered WITHOUT CVAR_SERVERINFO -- contrast the many CVAR_SERVERINFO cvars at sv_main.c:50-168 -- so the value is never in serverinfo; only a needpass 0/1/2/4 bitmask is published; (b) `Info_RemoveKey(userinfo,"password")` at 1098 strips the client-submitted password from the broadcast userinfo (comment "remove passwd").

Case-sensitivity of "none" (clause 5): connect gate uses case-INsensitive `strcasecmp` (1085); the Cmd_Join_f gate (2674) and needpass (3234) use case-SENSITIVE `strcmp`. The description says the literal "none" -- lowercase "none" disables at every site, so the claim holds; the connect-gate case-insensitivity is a harmless superset. Not a defect; recorded for completeness.

## flags_for_review

- [review/cross-mod-override/vpass] VIP-bypass asymmetry between the two password gates. The CONNECT-time player gate (sv_main.c:1085) short-circuits on `!vip`, so a VIP bypasses the player password at connect time -- matching clause 6. But the JOIN-command gate (sv_user.c:2674-2677, Cmd_Join_f) has NO vip check: a client already connected as a spectator who IS a VIP and runs `join` while `password` is set is STILL refused (told to disconnect/reconnect). So 'VIP clients bypass this gate' is true for the primary connect gate but NOT universal across all password gates. The proposed clause 6 reads as describing the connect gate (where it is correct), so this is a precision nuance, not a contradiction -- but it is a real behavioral asymmetry the description glosses, and a candidate for a description refinement (e.g. scope clause 6 to 'at connect time').
- [fyi/suspected-bug/vpass] Possible upstream inconsistency (mvdsv-side, not a description defect): the connect-time player gate accepts case-insensitive 'none' to disable (strcasecmp, sv_main.c:1085), while Cmd_Join_f (sv_user.c:2674) and the needpass computation (sv_main.c:3234) use case-SENSITIVE strcmp for 'none'. Setting password to e.g. 'None' would disable the connect gate but the join gate and needpass flag would treat it as an active password. Likely benign in practice (operators use 'none' lowercase or empty) but the three sites disagree on the OFF-token comparison.
- [fyi/off-scope-entity/vpass] In the spectator-connect branch (sv_main.c:1042-1044), a connecting spectator can be promoted to VIP by matching the PLAYER `password` cvar field (SV_VIPbyPass is tried against both the `spectator` userinfo value and the `password` userinfo value). This is spectator-side VIP logic and off-scope for the player-password knob, but worth noting that the `password` userinfo key is consumed in more than just the player gate.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "password",
  "type": "cvar",
  "description": "Sets a password that clients must supply to connect as a player. When set, anyone trying to join as a player without the matching password is refused; players already connected as spectators are likewise told to reconnect with the password. An empty value (or the literal \"none\") disables the requirement, leaving the server open to players. Clients granted VIP access bypass this gate. The password is never shown to clients.\n\nDefault: empty (no player password required).\nSet by: server config / rcon.\nSee also: spectator_password, vip_password, rcon_password.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1085. Registered {\"password\",\"\"} at src/sv_main.c:72 -- default empty. Connect-time gate enforced at src/sv_main.c:1083-1091: `pwd = password.string; if (!vip && pwd[0] && strcasecmp(pwd,\"none\") && strcmp(pwd,s)) { ... return false; }` -- the check is SKIPPED when the value is empty (pwd[0] false) OR equals \"none\" (case-insensitive), which is the OFF-state; otherwise a client whose supplied password (s = userinfo 'password') does not match is refused with 'server requires a password' (no value echoed -- the printed string is generic). VIP bypass is the `!vip` guard (vip resolved via SV_VIPbyPass/SV_VIPbyIP at src/sv_main.c:1078-1081). Second enforcing site: src/sv_user.c:2674 `if (password.string[0] && strcmp(password.string,\"none\"))` blocks a connected spectator's in-game join-as-player request when a player password is set, printing 'This server requires a player password. Please disconnect, set the password and reconnect'. The 'never shown' clause is enforced by both refusal strings being generic (src/sv_main.c:1088, src/sv_user.c:2675) and by Info_RemoveKey(userinfo,\"password\") at src/sv_main.c:1098 stripping it. Cross-links: siblings spectator_password (src/sv_main.c:1050-1063), vip_password (src/sv_main.c:102-103), rcon_password (src/sv_main.c:71) confirmed registered. No KTX override of plain 'password' (grep ktx/src empty). No read-only flag; settable via server config / rcon.",
  "description_proposed": null
}
```
