# describe-fill-synthesis ledger -- mvdsv `vip_addip`

- **project:** mvdsv
- **knob:** `vip_addip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_addip: synthesized -- admin cmd adds IP/range to VIP spectator list (level defaults to 1); VIP-truthy grants reserved maxvip_spectators slots at connect (sv_main.c:1202); in-memory until vip_writeip; no KTX override -- origin=synthesized ref=src/sv_main.c:2076 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Adds an IP address (or a dotted-decimal prefix covering a range) to the server's VIP spectator list, with an optional priority level. A connecting spectator whose real IP is on this list is treated as a VIP: they can take one of the reserved VIP spectator slots (set by maxvip_spectators) even after the public spectator slots (maxspectators) are full. The list is held in memory only -- use vip_writeip to save it.
>
> vip_addip <ip-prefix> [level] = add this address/range; widen the range like addip by using 0 octets as wildcards (e.g. 198.51.100.0 covers that whole class-C block). level is an optional priority number forwarded to the mod; if it is omitted or below 1 it is set to 1.
>
> Example: vip_addip 198.51.100.42 5 -- mark 198.51.100.42 as a VIP (priority 5).
>
> Default: none (the VIP list starts empty).
> Set by: server console / rcon.
> See also: vip_listip, vip_writeip, vip_removeip.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_main.c:3621 | `Cmd_AddCommand ("vip_addip", SV_AddIPVIP_f);` (and absent from ucmds[]) | MATCH |
| handler / arg shape | src/sv_main.c:2076-2085 | `if (!StringToFilter (Cmd_Argv(1), &f)) { Con_Printf ("Bad filter address: %s\n"...` | MATCH |
| level default/clamp to 1 | src/sv_main.c:2087-2089 | `l = Q_atoi(Cmd_Argv(2)); if (l < 1) l = 1;` | MATCH |
| appends to ipvip[], full msg | src/sv_main.c:2095-2106 | `if (numipvips == MAX_IPFILTERS) { Con_Printf ("VIP spectator IP list is full\n"); ... ipvip[i].level = l;` | MATCH |
| IP match returns level | src/sv_main.c:2730-2731 | `if ( (in & ipvip[i].mask) == ipvip[i].compare) return ipvip[i].level;` | MATCH |
| sets client vip at connect | src/sv_user.c:269 | `if ((sv_client->vip = SV_VIPbyIP(sv_client->realip)) == 0)` | MATCH |
| VIP grants reserved spec slot | src/sv_main.c:1202-1206 | `if (vip) { if (spass && (spectators < maxspectators.value || vips < maxvip_spectators.value)) return true; }` | MATCH |
| non-VIP spec only public slot | src/sv_main.c:1209 | `if (spass && spectators < (int)maxspectators.value) return true;` | MATCH |
| level only truthy in engine, value->mod | src/sv_main.c:1175 | `if (cl->vip) vips++;` | MATCH |
| in-memory only (persist elsewhere) | src/sv_main.c:2167 | `snprintf (name, MAX_OSPATH, "%s/vip_ip.cfg", fs_gamedir);` | MATCH |
| VIP does NOT bypass bans | src/sv_main.c:1897 | `if (SV_FilterPacket()/* && !client->vip*/)` (commented out) | MATCH |
| no KTX override | ktx/src (grep) | empty for vip_addip/maxvip_spectators/vip_ip.cfg | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Adds an IP / IP-mask RANGE to the VIP list | sv_main.c:2081, 2057-2058 | `StringToFilter(Cmd_Argv(1),&f)`; `if (b[i]!=0) m[i]=255` (mask derived per-octet) | MATCH (range supported) but the "IP/mask" framing is imprecise -- range is via dot-format octet truncation, not an explicit mask; see clause 7 |
| 2 | Optional priority `level` arg | sv_main.c:2087 | `l = Q_atoi(Cmd_Argv(2));` (absent arg -> "" -> 0) | MATCH |
| 3 | A spectator whose REAL IP is on the list is treated as VIP | sv_main.c:1347-1349; sv_user.c:269,285 | spec2 sets `rip_vip=1` "if realip is on vip list"; `Cmd_New_f` re-checks `SV_VIPbyIP(sv_client->realip)` | MATCH (authoritative check is against realip, important behind proxies) |
| 4 | VIP can take a reserved VIP slot (set by maxvip_spectators) | sv_main.c:1204; 1175-1176; 956-957 | `if (spass && (spectators<maxspectators \|\| vips<maxvip_spectators)) return true;`; `if(cl->vip) vips++`; FixMaxClientsCvars reserves the pool | MATCH |
| 5 | ...even after public spectator slots (maxspectators) are full | sv_main.c:1204 vs 1209 | VIP path has the extra `\|\| vips<maxvip_spectators`; non-VIP path only `spectators<maxspectators` | MATCH (VIP reaches a pool non-VIPs cannot; "even after full" conveys the benefit) |
| 6 | List is in memory only; use vip_writeip to save | sv_main.c:2105-2106 (RAM write); 2160-2188 (file write); grep: no auto-exec of vip_ip.cfg | `ipvip[i]=f` (in-mem); `SV_WriteIPVIP_f` -> `fopen("<gamedir>/vip_ip.cfg")` | MATCH |
| 7 | Syntax `vip_addip <ip>[/mask] [level]` | sv_main.c:2042-2063; authoritative comment 1977-1982 | loop reads <=4 numeric octets, `s++` skips ANY single separator; NO `/mask` parse. Comment: "specified in dot format ... unspecified digits match any value ... class C network with `addip 192.246.40`" | MISMATCH -- the `[/mask]` slash form does not exist. A literal `10.0.0.0/8` parses 4 zero-ish octets, the `/8` is swallowed, mask becomes 0.0.0.0 (matches every IP). Correct form is a dot-format prefix, e.g. `vip_addip 192.246.40 5` |
| 8a | level is a priority number PASSED THROUGH to the mod | sv_user.c:295; pr2_cmds.c:1628-1629 | `Info_SetStar(..,"*VIP", cl->vip ? va("%d",cl->vip):"")`; `infokey *VIP -> snprintf("%d", cl->vip)` | MATCH (numeric level reaches mod via *VIP after Cmd_New_f) |
| 8b | (the engine ITSELF only treats any non-zero level as "is a VIP") | sv_user.c:284-286 | `// get highest VIP level` / `if (sv_client->vip < SV_VIPbyIP(realip)) sv_client->vip = SV_VIPbyIP(realip)` | MISMATCH -- engine DOES compare level magnitudes (keeps the highest) and stores the actual number in cl->vip (int, server.h:196). Only the slot-availability check (SpectatorCanConnect) is boolean; the universal "only treats as is-a-VIP" is contradicted |
| 9 | If level omitted or below 1, set to 1 | sv_main.c:2087-2089 | `l = Q_atoi(Cmd_Argv(2)); if (l < 1) l = 1;` | MATCH (absent -> 0 -> 1; negatives -> 1) |
| 10 | Default: none (list starts empty) | sv_main.c:2015; grep (no auto-load) | `int numipvips;` (static, zero-init); nothing populates ipvip[] at boot | MATCH |
| 11 | Set by: server console / rcon | sv_main.c:3621 | `Cmd_AddCommand("vip_addip", SV_AddIPVIP_f)` -- plain server cmd, no client/redirected guard | MATCH |
| 12 | See also: vip_listip, vip_writeip, vip_removeip | sv_main.c:3622-3624 | all three registered via Cmd_AddCommand | MATCH (targets exist) |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. All VIP command code lives in sv_main.c; the connection-time level handling lives in sv_user.c (Cmd_New_f) and the mod bridge in pr2_cmds.c -- the enforcing lines for the two defective clauses are in DIFFERENT files than registration, exactly the case the discipline warns about.

CLASSIFICATION: C-FIX. Two clauses flatly contradict their enforcing code:

(1) Clause 7 -- the `<ip>[/mask]` syntax. StringToFilter (sv_main.c:2042-2063) has no slash/CIDR parsing; the mask is built per-octet (255 for each non-zero octet, 0 otherwise, lines 2057-2058). The authoritative in-source doc for this exact helper (sv_main.c:1977-1982, the shared addip block) states the address is "specified in dot format, and any unspecified digits will match any value" -- range = drop trailing octets (e.g. `vip_addip 192.246.40` for a class-C), NOT `ip/mask`. Worse, a user who follows the documented `/mask` form gets a silently-wrong result: `10.0.0.0/8` yields compare/mask 0.0.0.0 which matches EVERY ip. The `/mask` token was almost certainly imported from generic firewall convention, never traced to StringToFilter. flavour-C.

(2) Clause 8 parenthetical -- "the engine itself only treats any non-zero level as 'is a VIP'." This is true ONLY for the slot-availability gate (SpectatorCanConnect, sv_main.c:1204, which reads cl->vip as boolean). But sv_user.c:284-286 carries an explicit magnitude comparison with the comment `// get highest VIP level`, keeping the larger of the userinfo-pass level and the realip-list level; sv_user.c:295 then writes the actual NUMBER into *VIP, and pr2_cmds.c:1629 hands `cl->vip` (the int level, server.h:196) to the mod via infokey. So the engine both compares magnitudes and forwards the number -- the universal "only treats as is-a-VIP" is contradicted. The synth saw the boolean slot check and over-generalized; it missed the sv_user.c level-max path. flavour-C.

Note the two-stage flow that makes this subtle: SVC_DirectConnect (sv_main.c) collapses the level into a local `qbool vip` for the INITIAL slot decision and initial *VIP, which on its own would have made the parenthetical look correct. Cmd_New_f (sv_user.c) is the second stage that re-reads SV_VIPbyIP(realip) into the int field and restores the true level. A trace that stopped at sv_main.c would mis-confirm clause 8b -- this is exactly the callee/second-site follow the discipline mandates.

Everything else (clauses 2,3,4,5,6,9,10,11,12) is TRACED-CLEAN against located enforcing lines. Clause 1's range claim is correct; only its "IP/mask" wording is loose (downgraded into the clause-7 fix). Clause 5's "even after ... full" is acceptable shorthand for the reserved-pool benefit (the actual gate is an OR, not a strict after-full ordering).

Suggested fixes: (a) replace `vip_addip <ip>[/mask] [level]` with `vip_addip <ip-prefix> [level]` and describe range as dot-format octet truncation (drop trailing octets; e.g. `vip_addip 192.246.40 5` covers that class-C). (b) Rewrite clause 8: the level IS forwarded to the mod as a number (*VIP via infokey) and the engine keeps the highest matching level; only the spectator-slot admission test treats VIP as boolean.

## flags_for_review

- [fyi/other/synthesis] SV_AddIPVIP_f's free-slot search checks `ipvip[i].compare == 0xffffffff` as a reuse sentinel (src/sv_main.c:2092), copied from the ban-list code path (SV_AddIP_f at 2235), but nothing in the VIP code ever writes 0xffffffff into ipvip[].compare -- vip_removeip (2124-2134) compacts the array instead of tombstoning. The sentinel branch is dead for the VIP list (harmless; entries still reuse exact mask/compare duplicates). FYI only, not a user-doc concern.
- [fyi/cross-mod-override/synthesis] The `vip` privilege originally also gated SV_FilterPacket ban-dropping (`&& !client->vip` at src/sv_main.c:1897 is commented out). As shipped at this commit, VIP status does NOT exempt a client from IP bans -- worth a human confirming this is the intended current behavior vs. a disabled feature, since the commented code implies VIPs were once ban-exempt.
- [review/suspected-bug/vpass] SV_AddIPVIP_f (sv_main.c:2076-2107) has NO zero-compare guard, unlike its ban sibling SV_AddIP_f which rejects with `|| f.compare == 0` at sv_main.c:2206. Consequently `vip_addip 0.0.0.0` (or any all-zero-octet input, including the swallowed-slash `10.0.0.0/8` case) installs a filter with mask 0.0.0.0 / compare 0.0.0.0 that matches EVERY connecting IP -- silently VIP-flagging all spectators. Latent footgun, not part of any description clause.
- [fyi/off-scope-entity/vpass] vip_values (sv_main.c:104) is the password-based VIP-level mechanism (SV_VIPbyPass returns vip_value[i], sv_main.c:2763) that shares the same cl->vip int field and *VIP propagation as vip_addip's level. It is a sibling knob, not in scope here, but any future doc for vip_addip's `level` should cross-reference that *VIP carries whichever of (pass-level, ip-level) is highest -- see the max at sv_user.c:284-286.
- [fyi/other/vpass] The level value from vip_addip does NOT reach the mod during the brief cs_preconnected window before Cmd_New_f completes the realip handshake -- during that window *VIP is the boolean from SVC_DirectConnect (sv_main.c:1435-1437). The numeric level only appears after sv_user.c:295 runs. Edge timing, unlikely to matter for the description but noted for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_addip",
  "type": "command",
  "description": "Adds an IP address (or a dotted-decimal prefix covering a range) to the server's VIP spectator list, with an optional priority level. A connecting spectator whose real IP is on this list is treated as a VIP: they can take one of the reserved VIP spectator slots (set by maxvip_spectators) even after the public spectator slots (maxspectators) are full. The list is held in memory only -- use vip_writeip to save it.\n\nvip_addip <ip-prefix> [level] = add this address/range; widen the range like addip by using 0 octets as wildcards (e.g. 198.51.100.0 covers that whole class-C block). level is an optional priority number forwarded to the mod; if it is omitted or below 1 it is set to 1.\n\nExample: vip_addip 198.51.100.42 5 -- mark 198.51.100.42 as a VIP (priority 5).\n\nDefault: none (the VIP list starts empty).\nSet by: server console / rcon.\nSee also: vip_listip, vip_writeip, vip_removeip.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2076. Registered admin-only: Cmd_AddCommand(\"vip_addip\", SV_AddIPVIP_f) at src/sv_main.c:3621; NOT present in the client ucmds[] table or QC progs (grep of sv_user.c/pr_cmds.c/sv_ccmds.c empty), so per the access-class rule (Cmd_AddCommand-only => server console/rcon). Handler SV_AddIPVIP_f at src/sv_main.c:2076: parses arg1 via StringToFilter into an ipfilter_t (src/sv_main.c:2081; bad parse -> \"Bad filter address\"), reads level from arg2 via Q_atoi (2087) and clamps level<1 up to 1 (2089: `if (l < 1) l = 1;`), finds a free/duplicate slot and appends to ipvip[] up to MAX_IPFILTERS (2095-2103; full -> \"VIP spectator IP list is full\" at 2099), stores entry + level (2105-2106). ENFORCING grant (what VIP status confers -- traced out of the handler): SV_VIPbyIP at src/sv_main.c:2722-2734 returns ipvip[i].level when (in & mask)==compare (2730); at connection time sv_user.c:269 sets sv_client->vip = SV_VIPbyIP(realip) and sv_main.c:1046/1080 also consults it; the connection gate SpectatorCanConnect (src/sv_main.c:1198-1214) lets a VIP spectator (vip!=0) take a slot when spectators<maxspectators OR vips<maxvip_spectators (1202-1206), whereas a non-VIP spectator only passes when spectators<maxspectators (1209) -- so VIP grants access to the reserved maxvip_spectators slots; CountPlayersSpecsVips (1175) counts a connected spectator as a VIP iff cl->vip. The numeric level beyond truthiness is only surfaced to the mod via QC (G_FLOAT OFS_PARM0 at sv_user.c:991/2727/2814 and Info_SetStar \"*VIP\" at sv_user.c:295); the engine connection logic only tests vip-truthy. VIP does NOT bypass IP bans: the `&& !client->vip` on SV_FilterPacket at src/sv_main.c:1897 is commented out. In-memory only; persisted via vip_writeip (src/sv_main.c:2167,2181). F-MV1: grep of ktx/src for vip_addip/maxvip_spectators/vip_ip.cfg is empty -- no KTX override; this MVDSV-engine behavior is the live behavior.",
  "description_proposed": null
}
```
