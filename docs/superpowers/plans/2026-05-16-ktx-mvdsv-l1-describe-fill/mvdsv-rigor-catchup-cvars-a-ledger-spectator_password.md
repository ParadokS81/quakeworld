# describe-fill-synthesis ledger -- mvdsv `spectator_password`

- **project:** mvdsv
- **knob:** `spectator_password` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:spectator_password: synthesized -- gates spectator connect; supplied spectator value must match; empty/"none" disables; VIP-exempt; blocks 'observe'; KTX no override -- origin=synthesized ref=src/sv_main.c:1050 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a password that a client must supply to connect as a spectator. A connecting spectator is admitted only if the spectator value they send matches this password; if it does not match, the connection is refused. While a spectator password is set, the server also tells clients that a spectator password is needed, and a connected player cannot switch to spectator with the 'observe' command -- they must disconnect, set the password, and reconnect. VIP clients are exempt and may spectate without it.
>
> Empty or "none" = no spectator password (any client may spectate freely).
>
> Default: empty (no spectator password).
> Set by: server config / rcon.
> See also: password, vip_password, rcon_password.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default empty | src/sv_main.c:102 | `cvar_t spectator_password = {"spectator_password", ""};` | MATCH |
| settable (no ROM/flag) | src/sv_main.c:3472 | `Cvar_Register (&spectator_password);` (no Cvar_SetROM) | MATCH |
| gates spectator connect only | src/sv_main.c:1037 | `if (s[0] && strcmp(s, "0"))` (s = 'spectator' userinfo) | MATCH |
| supplied value must equal password | src/sv_main.c:1052 | `if (pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s)) { spass = false; }` | MATCH |
| OFF-state: empty or "none" admits freely | src/sv_main.c:1052 | check skipped when `!pwd[0]` or `pwd=="none"`; spass stays true (set l.1039) | MATCH |
| refusal on mismatch | src/sv_main.c:1057-1062 | `if (!vip && !spass){ ... "requires a spectator password" ... return false; }` | MATCH |
| VIP exemption | src/sv_main.c:1057 | `if (!vip && !spass)` -- VIP bypasses refusal | MATCH |
| dispatched at connect | src/sv_main.c:1317 | `if ( !CheckPasswords(...&spass,&vip,&spectator) ) return;` | MATCH |
| advertises 'password required' to clients | src/sv_main.c:3236 | `if (spw[0] && strcmp(spw, "none")) v |= 2;` -> needpass bit | MATCH |
| blocks in-session 'observe' switch | src/sv_user.c:2765 | `if (spectator_password.string[0] && strcmp(spectator_password.string, "none")) { ... "requires a spectator password" ... return; }` | MATCH |
| KTX no override (F-MV1) | ktx/src (grep) | zero hits for spectator_password | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Sets a password that a client must supply to connect as a spectator" | sv_main.c:1037, 1050-1052 | `if (s[0] && strcmp(s, "0")) { spass = true; ... pwd = spectator_password.string; if (pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s)) spass = false;` | MATCH |
| 2 | "admitted only if the spectator value they send matches this password" | sv_main.c:1052 | `if (pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s))` (strcmp(pwd,s)==0 i.e. exact case-sensitive match of sent `spectator` value keeps spass true) | MATCH |
| 3 | "if it does not match, the connection is refused" | sv_main.c:1057-1062 | `if (!vip && !spass) { Con_Printf("...spectator password failed..."); Netchan_OutOfBandPrint(...); return false; }` | MATCH |
| 4 | "server also tells clients that a spectator password is needed" | sv_main.c:3236-3245 | `if (spw[0] && strcmp(spw, "none")) v |= 2; ... Info_SetValueForKey (svs.info, "needpass", va("%i",v), ...)` (needpass serverinfo bit 2) AND OOB string sv_main.c:1060 `"%c\nrequires a spectator password\n\n"` | MATCH |
| 5 | "a connected player cannot switch to spectator with the 'observe' command" while a password is set | sv_user.c:2765-2768 | `if (spectator_password.string[0] && strcmp (spectator_password.string, "none")) { SV_ClientPrintf(..., "This server requires a %s password. Please disconnect, set the password and reconnect as %s.\n", "spectator", "spectator"); return; }` | MATCH |
| 6 | "they must disconnect, set the password, and reconnect" | sv_user.c:2766 | `"...Please disconnect, set the password and reconnect as spectator."` (verbatim guidance string) | MATCH |
| 7 | "VIP clients are exempt and may spectate without it" (connect path) | sv_main.c:1042-1046, 1057 | `if (!(vip = SV_VIPbyPass(s))) { if (!(vip = SV_VIPbyPass(Info_ValueForKey(userinfo,"password")))) vip = SV_VIPbyIP(net_from); } ... if (!vip && !spass) ... return false;` (vip short-circuits refusal) | MATCH (connect path; observe path differs -- see flag) |
| 8 | OFF-state: `Empty or "none" = no spectator password (any client may spectate freely)` | sv_main.c:1052 | `if (pwd[0] && strcasecmp(pwd, "none") && strcmp(pwd, s))` -- empty `pwd[0]==0` or `pwd=="none"` (case-insensitive) leaves spass true, no refusal | MATCH |
| 9 | "Default: empty (no spectator password)" | sv_main.c:102 (registration) + 3472 (Cvar_Register, no override) | `cvar_t spectator_password = {"spectator_password", ""};` / `Cvar_Register (&spectator_password);` | MATCH |
| 10 | "Set by: server config / rcon" | (implicit -- standard server cvar, no flag restricting) sv_main.c:102 has no CVAR_ROM/CVAR_USERINFO | `{"spectator_password", ""}` (no flags field -> normal writable server cvar) | MATCH |
| 11 | See also: password, vip_password, rcon_password (real cvar names) | sv_main.c:71, 102(password ref), 103 | `rcon_password = {"rcon_password", ""}` (l71); `vip_password = {"vip_password", ""}` (l103); `password` referenced sv_main.c:1083 | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Read enforce-trace-discipline.md and applied per-clause.

Wide-grep covered ALL use-sites of spectator_password across src (sv_main.c registration l102 + connect-check l1050-1063 + needpass l3222-3245 + register l3472; sv_user.c observe-path l2765). Comment-only hits (sv_main.c:1316 "check for password or spectator_password", l3222) point at the real enforcers, which were traced (l1316 calls CheckPasswords -> the callee at l1050-1063 carries the gate; followed the callee per the dropquad lesson rather than stopping at the caller).

Every material clause maps to a located enforcing line and MATCHES, including adjacent code/comments:
- Admit/refuse polarity verified at the actual branch (l1052 sets spass=false on mismatch; l1057 `if (!vip && !spass) return false`). The match is on the client-sent `spectator` userinfo value via case-sensitive strcmp(pwd, s); OFF when pwd empty or =="none".
- needpass advertisement verified (bit 2, l3236) plus the OOB "requires a spectator password" string (l1060) -- the "tells clients a spectator password is needed" claim has BOTH a serverinfo and a connect-refusal-string enforcer.
- observe-command block verified verbatim (sv_user.c:2766 guidance string matches "disconnect, set the password, and reconnect" near-verbatim).
- VIP-exempt verified at the connect path (vip short-circuits the refusal, l1057). Description correctly scopes this to connecting-as-spectator.
- Default empty verified at REGISTRATION (l102 `{"spectator_password",""}`) and Cvar_Register with no override (l3472) -- WI-2 satisfied, not a shipped-cfg inference.

Classification TRACED-CLEAN: no clause is name/enum/string-only inference; each reduces to a checkable fact at its enforcing line. The one asymmetry (observe path has no VIP exemption while connect path does) is a non-contradicting nuance, flagged below as FYI, not a defect -- the description's two sentences keep the connect-exemption and the universal-observe-block on separate claims, so neither is wrong.

Minor cross-path "none" inconsistency observed (connect path l1052 uses case-insensitive strcasecmp(pwd,"none"); needpass l3236 and observe l2765 use case-sensitive strcmp(...,"none")). Lowercase "none" -- the canonical form the description uses -- is OFF in all three paths, so clause 8 is correct. Noted as FYI only.

## flags_for_review

- [fyi/other/vpass] VIP exemption is asymmetric across the two spectator-password gates. Connect path (sv_main.c:1057 `if (!vip && !spass)`) EXEMPTS VIPs -- a VIP joins as spectator even without the spectator password. The 'observe' command path (sv_user.c:2765-2768) does NOT check vip at all -- it blocks ALL spawned players, including VIPs, whenever a spectator password is set, telling them to disconnect/reconnect. The description's VIP-exempt sentence is true for the connect path (where it is scoped) and does not contradict the separate observe-block sentence, so the row is TRACED-CLEAN. Flagging only so a future reader does not over-generalize 'VIPs are exempt' to the observe command.
- [fyi/suspected-bug/vpass] Cross-path inconsistency in how 'none' is matched: connect-path gate uses case-insensitive strcasecmp(pwd,"none") (sv_main.c:1052), whereas the needpass advertiser (sv_main.c:3236) and the observe-command gate (sv_user.c:2765) use case-sensitive strcmp(...,"none"). Consequence: a value of e.g. "None" or "NONE" would be treated as OFF by the connect gate but as an ACTIVE password by the needpass/observe paths -- a latent behavioral inconsistency in mvdsv itself. The canonical lowercase "none" (which the description uses) is consistently OFF in all three, so no clause is wrong. Filing as a suspected upstream inconsistency, not a description defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "spectator_password",
  "type": "cvar",
  "description": "Sets a password that a client must supply to connect as a spectator. A connecting spectator is admitted only if the spectator value they send matches this password; if it does not match, the connection is refused. While a spectator password is set, the server also tells clients that a spectator password is needed, and a connected player cannot switch to spectator with the 'observe' command -- they must disconnect, set the password, and reconnect. VIP clients are exempt and may spectate without it.\n\nEmpty or \"none\" = no spectator password (any client may spectate freely).\n\nDefault: empty (no spectator password).\nSet by: server config / rcon.\nSee also: password, vip_password, rcon_password.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1050. Shipped trailing comment (sv_main.c:102 'password for entering as a spectator') is a serviceable one-liner but not in D20 shape (no Default/Set-by/OFF-state/value meanings) -> full synthesis per operator decision 2026-05-30, not verbatim affirm. Default empty: registered cvar_t literal {\"spectator_password\", \"\"} at sv_main.c:102, plain Cvar_Register at sv_main.c:3472 with no Cvar_SetROM/flag -> settable via server config/rcon (no read-only). NOT on the sv_crypt_rcon blocklist (separate cluster). Primary enforcing gate CheckPasswords sv_main.c:1050-1063: the spectator branch is entered only when the client sends a non-empty, non-\"0\" 'spectator' userinfo value (sv_main.c:1037 'if (s[0] && strcmp(s, \"0\"))'); pwd=spectator_password.string (1050); match check 'if (pwd[0] && strcasecmp(pwd,\"none\") && strcmp(pwd,s)) spass=false' (1052) -> the supplied spectator value s must equal the password (case-sensitive strcmp), else spass cleared. OFF-state: same line 1052 SKIPS the check when pwd empty OR equals \"none\" (strcasecmp) -> spass stays true (set 1039) -> admitted without password. Refusal: 'if (!vip && !spass)' (1057) prints '%s:spectator password failed' and sends 'requires a spectator password' (1059-1062). VIP exemption: the !vip in the 1057 guard means a VIP (by pass/IP, set 1042-1047) is admitted even when spass is false. Caller SV_ConnectClient dispatches this via CheckPasswords at sv_main.c:1317 and returns on failure (1318). 'needpass' advertisement (SV_CheckVars sv_main.c:3236 'if (spw[0] && strcmp(spw,\"none\")) v |= 2') ORs bit 2 into the needpass serverinfo flag when a spectator password is set & not \"none\" -> server advertises a spectator password is required (only that it is required, never the value) -- user-observable, action-relevant. 'observe' side-effect: Cmd_Observe_f sv_user.c:2765 'if (spectator_password.string[0] && strcmp(spectator_password.string,\"none\"))' prints 'This server requires a spectator password. Please disconnect, set the password and reconnect as spectator' and returns (2766-2767) -> blocks in-session switch to spectator while a spectator password is set. Sensitive: no use-site displays the value; needpass exposes only the required-flag. F-MV1: grep of /home/paradoks/projects/quakeworld/research/repos/ktx/src for spectator_password returns zero hits -> no KTX override; engine behavior is the live behavior. See-also cross-links the password cluster (password sv_main.c:1083, vip_password sv_main.c:103, rcon_password).",
  "description_proposed": null
}
```
