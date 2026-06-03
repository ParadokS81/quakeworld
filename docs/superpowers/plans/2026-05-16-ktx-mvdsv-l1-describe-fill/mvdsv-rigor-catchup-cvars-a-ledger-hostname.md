# describe-fill-synthesis ledger -- mvdsv `hostname`

- **project:** mvdsv
- **knob:** `hostname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:hostname: synthesized -- server display name published via serverinfo; CVAR_SERVERINFO->SV_ServerinfoChanged -- origin=synthesized ref=src/cvar.c:157 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> The server's display name -- the text shown for the server in server browsers and in-game listings. Changing it republishes the new name to connected clients and the browser immediately.
>
> Default: unnamed.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| value published into serverinfo on change | src/cvar.c:157 | `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string);` | MATCH |
| serverinfo write + live push to clients | src/sv_ccmds.c:1379 | `Info_SetValueForKey(svs.info, key, string, ...); SV_SendServerInfoChange(key, string);` | MATCH |
| CVAR_SERVERINFO flag on this cvar | src/sv_main.c:176 | `cvar_t hostname = {"hostname", "unnamed", CVAR_SERVERINFO};` | MATCH |
| Default 'unnamed' (registered) | src/sv_main.c:176 | `{"hostname", "unnamed", CVAR_SERVERINFO}` | MATCH |
| settable, not rcon-blocked | src/sv_main.c:1754-1764 | blocklist tokens do not include 'hostname' | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | hostname is the server's display name shown in server browsers and in-game listings | sv_main.c:176 (registration, CVAR_SERVERINFO) ; browser-facing read sv_main.c:629 ; client-facing read sv_user.c:484 | `cvar_t hostname = {"hostname", "unnamed", CVAR_SERVERINFO}; // example: "QUAKE.SE KTX:28501"` / SVC_Status: `Con_Printf ("%s\n", svs.info);` / SV_New_f: `MSG_WriteString (&sv_client->netchan.message, va("fullserverinfo \"%s\"\n", svs.info) );` | MATCH |
| 2 | Changing republishes the new name to connected clients | cvar.c:157-159 -> sv_ccmds.c:1379 (SV_ServerinfoChanged) -> sv_ccmds.c:1368-1376 (SV_SendServerInfoChange) | `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` ... `MSG_WriteByte (&sv.reliable_datagram, svc_serverinfo); MSG_WriteString (&sv.reliable_datagram, key); MSG_WriteString (&sv.reliable_datagram, value);` | MATCH |
| 3 | Changing republishes to the browser immediately | sv_ccmds.c:1383-1384 (svs.info updated synchronously) ; sv_main.c:629 (SVC_Status emits svs.info on browser query) | `Info_SetValueForKey (svs.info, key, string, MAX_SERVERINFO_STRING);` ... SVC_Status: `if (opt == STATUS_OLDSTYLE || (opt & STATUS_SERVERINFO)) Con_Printf ("%s\n", svs.info);` | MATCH (value live in svs.info at set-time; surfaced on next browser poll -- see flag) |
| 4 | Default: unnamed | sv_main.c:176 | `cvar_t hostname = {"hostname", "unnamed", CVAR_SERVERINFO};` | MATCH |
| 5 | Set by: server config / rcon | console path via cvar.c:122 Cvar_Set (no CVAR_ROM on hostname) ; rcon path sv_main.c:1828 | `Cmd_ExecuteString(str);` (SVC_RemoteCommand executes the rcon command string after Rcon_Validate); hostname has no CVAR_ROM flag so it is freely settable | MATCH |

**V-pass notes:** VERSION CONFIRMED: git describe == 1.11-53-g18d0362.

All five material clauses trace to located, verified enforcing lines (incl. adjacent comments). Classification: TRACED-CLEAN.

Wide-grep of `hostname` (case-insensitive) returned 5 hits; 3 are OS-hostname noise, NOT the cvar: net.c:349 (comment re: IP resolution), net.c:1238 (gethostname() OS call), sv_user.c:237 ("Set hostname in your operation system" -- OS-level advice, unrelated to the cvar). The cvar itself has exactly two material sites: registration (sv_main.c:176) and Cvar_Register (sv_main.c:3497). All behavior is driven by the CVAR_SERVERINFO flag, so the enforcing logic lives in DIFFERENT files (cvar.c, sv_ccmds.c, sv_main.c SVC_Status) than the registration -- correctly followed the call chain into each callee per the discipline.

Clause 1 (display name): hostname registered CVAR_SERVERINFO -> mirrored into svs.info. svs.info is served to (a) server browsers via the connectionless SVC_Status response (sv_main.c:629, dispatched on the "status" command at sv_main.c:1932-1933) and (b) connected clients as `fullserverinfo` (sv_user.c:484 on SV_New_f, and sv_demo.c:1313 for demos). "server browsers and in-game listings" is accurate -- both surfaces verified.

Clause 2 (republish to clients): VERIFIED end-to-end. Cvar_Set (cvar.c:157-160) unconditionally calls SV_ServerinfoChanged for any CVAR_SERVERINFO cvar on every set. SV_ServerinfoChanged (sv_ccmds.c:1379-1387) updates svs.info AND, only if the value actually changed (strcmp guard at 1383), calls SV_SendServerInfoChange, which writes a svc_serverinfo message (key+value) to sv.reliable_datagram -- pushed to all connected clients. This IS an immediate push. Note the strcmp guard means a no-op set (same value) does not re-broadcast -- this does not affect any clause as written.

Clause 3 (browser immediately): The browser-visible value (svs.info) is mutated synchronously at set-time (Info_SetValueForKey, sv_ccmds.c:1384). There is NO deferred/periodic republish queue -- the new name is live the instant the cvar changes. A browser sees it on its next `status` poll (SVC_Status, sv_main.c:629). Mechanism is poll, not push, for browsers -- but the proposed text bundles clients+browser under one "republishes... immediately," and the clients side IS a genuine immediate push, while the browser side is immediately-available-on-next-poll. This is still-true, traceable minor vagueness (acceptable per the TRACED-CLEAN enum). Flagged fyi.

Clause 4 (default unnamed): WI-2 satisfied -- verified against the REGISTERED default at sv_main.c:176, the literal `"unnamed"` in the cvar_t initializer, NOT a shipped-cfg value. Exact match.

Clause 5 (set by config/rcon): hostname carries CVAR_SERVERINFO only -- NO CVAR_ROM (contrast sv_paused/pm_pground which have CVAR_ROM). So it is freely settable from a console/config command (standard Cvar_Set path) and from rcon (SVC_RemoteCommand -> Rcon_Validate against rcon_password/master_rcon_password -> Cmd_ExecuteString at sv_main.c:1828, which runs the arbitrary command string). Both stated set-paths verified. The description does not claim any access-class restriction beyond the implicit rcon-password gate, so no WI-2 access-class over-claim.

No OnChange handler on hostname (registration has only 3 fields: name/default/flags; no 4th callback), so no hidden side-effect beyond the CVAR_SERVERINFO mirror path.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX temporarily rewrites hostname during matches: ktx/src/match.c:1192 saves the operator's name to _k_host at match start, match.c:1198/1204/1209 append team tags (e.g. ' (te1 vs. te2)\207'), and match.c:304 restores the saved name at match end. An admin may observe their hostname changing on its own during games -- this is KTX, not the engine. Candidate 'See also:' to a server-naming L3 note if one exists; documented here as the engine-stored meaning per the L1/L3 split.
- [fyi/other/vpass] Clause 3 framing: 'republishes... to the browser immediately' reads as a push to the browser, but the actual mechanism for browsers is poll-based -- the server updates svs.info synchronously at set-time (sv_ccmds.c:1384) and a server browser receives the new value only on its next connectionless 'status' query (SVC_Status, sv_main.c:629). For already-connected clients the republish IS a genuine immediate push (svc_serverinfo on sv.reliable_datagram, sv_ccmds.c:1373-1375). The sentence bundles both under one 'immediately'; practically accurate (new name visible on next browser refresh, no deferred server-side step) but the push-vs-poll distinction for the browser is glossed. Non-blocking; does not contradict code.
- [fyi/other/vpass] SV_ServerinfoChanged broadcasts to clients only when the value actually changed (strcmp guard, sv_ccmds.c:1383). Setting hostname to its current value is a no-op re: re-broadcast. Does not affect any clause as written; noted for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "hostname",
  "type": "cvar",
  "description": "The server's display name -- the text shown for the server in server browsers and in-game listings. Changing it republishes the new name to connected clients and the browser immediately.\n\nDefault: unnamed.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:157. No real prior description (raw registration comment is just an example string) -> synthesized. hostname is registered CVAR_SERVERINFO at src/sv_main.c:176 (default 'unnamed'). The enforcing publish path: any Cvar_Set on a CVAR_SERVERINFO cvar reaches src/cvar.c:157 `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(var->name, var->string);`, and SV_ServerinfoChanged (src/sv_ccmds.c:1379) writes the value into the serverinfo string via Info_SetValueForKey and pushes it to clients via SV_SendServerInfoChange -- i.e. the name surfaces in the serverinfo the browser/clients read, and updates live on change. Default 'unnamed' from the registered literal (WI-2). Settable (CVAR_SERVERINFO, no ROM; not on the rcon blocklist) -> server config / rcon. I deliberately keep the description to the engine-stored meaning (display name in serverinfo) and do NOT inline the KTX match decoration (see flag). F-MV1: KTX rewrites hostname during matches -- ktx/src/match.c:1192 saves it to _k_host at match start, match.c:1198/1204/1209 append team tags like ' (te1 vs. te2)', and match.c:304 restores it at match end; ktx/src/stats_xml.c:236 and stats_json.c:471 also read hostname into match stats. This is mod behavior layered on the engine's serverinfo publish, surfaced as a flag rather than inlined (it does not change how an admin SETS the base name).",
  "description_proposed": null
}
```
